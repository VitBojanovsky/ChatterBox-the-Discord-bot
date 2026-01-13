require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const Database = require("better-sqlite3");

// ---- Initialize Discord Client ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const PREFIX = "!";
const db = new Database("data.db");

// ---- Create Users Table ----
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    points INTEGER DEFAULT 0,
    last_message INTEGER DEFAULT 0
  )
`).run();

// ---- In-memory cooldowns and spin tracking ----
const messageCooldown = 60 * 1000; // 60s per message
const spinCooldownMS = 7 * 1000; // 7s per user
const userMessageTimestamps = new Map();
const spinCooldown = new Map();
const spinningUsers = new Set();

// ---- Utility Functions ----
function asyncDB(fn) {
  return new Promise(resolve => setImmediate(() => resolve(fn())));
}

async function getUser(userId) {
  return asyncDB(() => db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId));
}

async function createUserIfMissing(userId) {
  return asyncDB(() => db.prepare("INSERT OR IGNORE INTO users (user_id, points, last_message) VALUES (?, 0, 0)").run(userId));
}

async function updateUserPoints(userId, points) {
  return asyncDB(() => db.prepare(`
    INSERT INTO users (user_id, points, last_message)
    VALUES (?, ?, 0)
    ON CONFLICT(user_id) DO UPDATE SET points = points + ?
  `).run(userId, points, points));
}

async function setLastMessage(userId, timestamp) {
  return asyncDB(() => db.prepare("UPDATE users SET last_message = ? WHERE user_id = ?").run(timestamp, userId));
}

function coinflip() {
  return Math.random() < 0.5 ? "heads" : "tails";
}

// ---- Event: Bot Ready ----
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ---- Event: Message Received ----
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  await handlePoints(message);
  await handleCommands(message);
});

// ---- Handle Points ----
async function handlePoints(message) {
  const userId = message.author.id;
  const now = Date.now();

  const lastMsg = userMessageTimestamps.get(userId) || 0;
  if (now - lastMsg < messageCooldown) return;
  if (message.content.trim().length < 5) return;

  await createUserIfMissing(userId);
  await updateUserPoints(userId, 1);
  await setLastMessage(userId, now);

  userMessageTimestamps.set(userId, now);
}

// ---- Handle Commands ----
async function handleCommands(message) {
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  const userId = message.author.id;

  // ---- !points ----
  if (command === "points") {
    await createUserIfMissing(userId);
    const user = await getUser(userId);
    const pts = user ? user.points : 0;
    message.reply(`You have ${pts} points.`);
  }

  // ---- !give <@user> <amount> ----
  if (command === "give") {
    if (args.length !== 2) {
      message.reply("Usage: !give <@target> <amount>");
      return;
    }

    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[1], 10);

    if (!targetUser) {
      message.reply("You must mention a valid user to give points to.");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      message.reply("Amount must be a positive number.");
      return;
    }

    if (targetUser.id === userId) {
      message.reply("You cannot give points to yourself.");
      return;
    }

    if (targetUser.bot) {
      message.reply("Bots do not need points.");
      return;
    }

    await createUserIfMissing(userId);
    await createUserIfMissing(targetUser.id);

    const giver = await getUser(userId);
    if (amount > giver.points) {
      message.reply("You are too broke to afford that.");
      return;
    }

    await updateUserPoints(userId, -amount);
    await updateUserPoints(targetUser.id, amount);

    message.reply(`You gave ${amount} points to <@${targetUser.id}>.`);
  }

  // ---- !coinflip <amount> <heads/tails> ----
  if (command === "coinflip" || command === "cf") {
    if (args.length !== 2) {
      message.reply("Usage: !coinflip <amount> <heads/tails>");
      return;
    }

    const amount = parseInt(args[0], 10);
    const choice = args[1].toLowerCase();

    if (isNaN(amount) || amount <= 0) {
      message.reply("You must enter a valid amount to gamble.");
      return;
    }

    await createUserIfMissing(userId);
    const user = await getUser(userId);

    if (amount > user.points) {
      message.reply("You are too broke to gamble that amount. you are as broke as Martin.");
      return;
    }

    if (choice !== "heads" && choice !== "tails") {
      message.reply("Your choice must be either 'heads' or 'tails', idiot");
      return;
    }

    const result = coinflip();
    if (result === choice) {
      await updateUserPoints(userId, amount);
      message.reply(`The coin landed on **${result}**! You won ${amount} points!`);
    } else {
      await updateUserPoints(userId, -amount);
      message.reply(`The coin landed on **${result}**! You lost ${amount} points!`);
    }
  }

  // ---- !diceroll <amount> <1-6> ----
  if (command === "diceroll" || command === "dr") {
    if (args.length !== 2) {
      message.reply("Usage: !diceroll <amount> <1-6>");
      return;
    }

    const amount = parseInt(args[0], 10);
    const choice = parseInt(args[1], 10);

    if (isNaN(amount) || amount <= 0) {
      message.reply("You must enter a valid amount to gamble.");
      return;
    }

    if (isNaN(choice) || choice < 1 || choice > 6) {
      message.reply("Your choice must be a number between 1 and 6, idiot");
      return;
    }

    await createUserIfMissing(userId);
    const user = await getUser(userId);

    if (amount > user.points) {
      message.reply("You are too broke to gamble that amount. you are as broke as Martin.");
      return;
    }

    const result = Math.floor(Math.random() * 6) + 1;
    if (result === choice) {
      await updateUserPoints(userId, amount * 5);
      message.reply(`The dice rolled a **${result}**! You won ${amount * 5} points!`);
    } else {
      await updateUserPoints(userId, -amount);
      message.reply(`The dice rolled a **${result}**! You lost ${amount} points!`);
    }
  }

  // ---- !spin <amount> ----
  if (command === "spin") {
    const now = Date.now();
    const lastSpin = spinCooldown.get(userId) || 0;
    if (now - lastSpin < spinCooldownMS) {
      message.reply(`You must wait ${Math.ceil((spinCooldownMS - (now - lastSpin))/1000)}s before spinning again.`);
      return;
    }
    spinCooldown.set(userId, now);

    if (spinningUsers.has(userId)) {
      message.reply("You already have a spin in progress! Wait until it finishes.");
      return;
    }

    if (args.length !== 1) {
      message.reply("Usage: !spin <amount>");
      return;
    }

    const amount = parseInt(args[0], 10);
    if (isNaN(amount) || amount <= 0) {
      message.reply("You must enter a valid amount to gamble.");
      return;
    }

    await createUserIfMissing(userId);
    const user = await getUser(userId);
    if (amount > user.points) {
      message.reply("You are too broke to gamble that amount.");
      return;
    }

    await updateUserPoints(userId, -amount);

    spinningUsers.add(userId);
    const ovoce = ["🍒", "🍇", "🍍", "🍉", "⭐", "7️⃣"];
    let spin1 = 0, spin2 = 0, spin3 = 0;
    let ticks = 0;

    spin1 = Math.floor(Math.random() * ovoce.length);
    spin2 = Math.floor(Math.random() * ovoce.length);
    spin3 = Math.floor(Math.random() * ovoce.length);

    const spinMessage = await message.channel.send(`${ovoce[spin1]} ${ovoce[spin2]} ${ovoce[spin3]} (5 spins remaining)`);

    const interval = setInterval(async () => {
      spin1 = Math.floor(Math.random() * ovoce.length);
      spin2 = Math.floor(Math.random() * ovoce.length);
      spin3 = Math.floor(Math.random() * ovoce.length);

      ticks++;

      if (spin1 === spin2 && spin2 === spin3) {
        clearInterval(interval);
        const win = amount * 10;
        await updateUserPoints(userId, win);
        await spinMessage.edit(`🎉 Jackpot! ${ovoce[spin1]} ${ovoce[spin2]} ${ovoce[spin3]} — You won ${win} points!`);
        spinningUsers.delete(userId);
        return;
      }

      if (ticks >= 5) {
        clearInterval(interval);
        await spinMessage.edit(`💀 Final result: ${ovoce[spin1]} ${ovoce[spin2]} ${ovoce[spin3]} — You lost ${amount} points.`);
        spinningUsers.delete(userId);
      } else {
        await spinMessage.edit(`${ovoce[spin1]} ${ovoce[spin2]} ${ovoce[spin3]} (${5 - ticks} spins remaining)`);
      }
    }, 1000);
  }

  // ---- !leaderboard ----
  if (command === "leaderboard") {
    const top = await asyncDB(() => db.prepare("SELECT user_id, points FROM users ORDER BY points DESC LIMIT 5").all());
    if (top.length === 0) {
      message.reply("No data yet. Speak more.");
      return;
    }
    const lines = top.map((row, i) => `${i + 1}. <@${row.user_id}> — ${row.points} pts`);
    message.channel.send("**Leaderboard**\n" + lines.join("\n"));
  }


  // Shop with roles
  if (command === "shop") {
    message.reply("To buy items from the shop, type !buy <item_ID>\n Available items: \n1.  Pro gambler role - 1 000 000 points\n2. Ultra gambler - 5 000 000 points\n3. siGma gambler role - 10 000 000 points\n4. sigma matyjáš s velkým m - 2 points");
  }
  if (command === "buy") {
    if (args.length !== 1) {
      message.reply("Usage: !buy <item_ID>");
      return;
    }
    const balance = user.points;
    const itemId = args[0];
    //check if item ID is a number
    if (isNaN(itemId)) {
      message.reply("Item ID must be a number.");
      return;
    }
    //get user ID
    const userId = message.author.id;
    switch(itemId) {
      case 1:
        if(balance>=1000000) {
          //check if user already has that role
          const role = message.guild.roles.cache.find(r => r.name === "Pro gambler");
          if(message.member.roles.cache.has(role.id)) {
            message.reply("You already own this role, dumbo.");
            return;
          }
          if (role == null) {
            //create role if it doesn't exist
            message.guild.roles.create({ name: 'Pro gambler', color: 'GOLD' })   
          }
          //give role to user
          await updateUserPoints(userId, -1000000);
          message.member.roles.add(role);
          message.reply("You have successfully purchased the Pro gambler role!");
          break;
        }
        case 2:
        if(balance>=5000000) {
          const role = message.guild.roles.cache.find(r => r.name === "Ultra gambler");
          if(message.member.roles.cache.has(role.id)) {
            message.reply("You already own this role, dumbo.");
            return;
          }
          if (role == null) {
            //create role if it doesn't exist
            message.guild.roles.create({ name: 'Ultra gambler', color: 'PURPLE' })   
          }
          await updateUserPoints(userId, -5000000);
          message.member.roles.add(role);
          message.reply("You have successfully purchased the Ultra gambler role!");
          break;
        }
      case 3:
        if(balance>=10000000) {
          const role = message.guild.roles.cache.find(r => r.name === "siGma gambler");
          if(message.member.roles.cache.has(role.id)) {
            message.reply("You already own this role, normally I would call you an idiot, but owning this is quite impressive, thank you for gambling so much.");
            return;
          }
          if (role == null) {
            //create role if it doesn't exist
            message.guild.roles.create({ name: 'siGma gambler', color: 'BLUE' })   
          }
          await updateUserPoints(userId, -10000000);
          message.member.roles.add(role);
          message.reply("You have successfully purchased the siGma gambler role!");
          break;
        }
      case 4:
        if(balance>=2) {
          const role = message.guild.roles.cache.find(r => r.name === "sigma matyjáš s velkým m");
          if(message.member.roles.cache.has(role.id)) {
            message.reply("You already own this role, dumbo.");
            return;
          }
          if (role == null) {
            //create role if it doesn't exist
            message.guild.roles.create({ name: 'sigma matyjáš s velkým m', color: 'GREEN' })   
          }
          await updateUserPoints(userId, -2);
          message.member.roles.add(role);
          message.reply("You have successfully purchased the sigma matyjáš s velkým m role!");
          break;
        }

    }

    
    // Assign role if item has role_id
  }
}

// ---- Run bot ----
client.login(process.env.DISCORD_TOKEN);
