
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const Database = require("better-sqlite3");


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

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    points INTEGER DEFAULT 0,
    last_message INTEGER DEFAULT 0
  )
`).run();


client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", message => {
  if (message.author.bot) return;

  handlePoints(message);
  handleCommands(message);
});


function handlePoints(message) {
  const userId = message.author.id;
  const now = Date.now();

  
  let user = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);

  
  if (!user) {
    db.prepare("INSERT INTO users (user_id, points, last_message) VALUES (?, ?, ?)")
      .run(userId, 0, 0);
    user = { user_id: userId, points: 0, last_message: 0 };
  }

  
  const cooldown = 60 * 1000; 
  if (now - user.last_message < cooldown) return;
  if (message.content.trim().length < 5) return;

  
  db.prepare("UPDATE users SET points = points + 1, last_message = ? WHERE user_id = ?")
    .run(now, userId);
}

function coinflip() {
  const rand = Math.random();
  if (rand < 0.5) {
    return "heads";
  } else {
    return "tails";
  } 
  }

function handleCommands(message) {
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // Show points
  if (command === "points") {
    const user = db.prepare("SELECT points FROM users WHERE user_id = ?").get(message.author.id);
    const pts = user ? user.points : 0;
    message.reply(`You have ${pts} points.`);
  }

  //give points
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

  const giverId = message.author.id;

  if (targetUser.id === giverId) {
    message.reply("You cannot give points to yourself.");
    return;
  }

  if (targetUser.bot) {
    message.reply("Bots do not need points.");
    return;
  }

  // Ensure giver exists
  db.prepare(
    "INSERT OR IGNORE INTO users (user_id, points, last_message) VALUES (?, 0, 0)"
  ).run(giverId);

  const giver = db.prepare(
    "SELECT points FROM users WHERE user_id = ?"
  ).get(giverId);

  if (amount > giver.points) {
    message.reply("You are too broke to afford that.");
    return;
  }

  // Remove points from giver
  db.prepare(
    "UPDATE users SET points = points - ? WHERE user_id = ?"
  ).run(amount, giverId);

  // Add to target
  db.prepare(`
    INSERT INTO users (user_id, points, last_message)
    VALUES (?, ?, 0)
    ON CONFLICT(user_id) DO UPDATE SET points = points + ?
  `).run(targetUser.id, amount, amount);

  message.reply(`You gave ${amount} points to <@${targetUser.id}>.`);
}


  // Coinflip command
  if (command === "coinflip" || command === "cf") {
    //check amount of args
    if (args.length !== 2) {
      message.reply("Usage: !coinflip <amount> <heads/tails>");
      return
  }
    const amount = parseInt(args[0], 10);
    const choice = args[1].toLowerCase();

    //check if player has money to gamble
    const userId = message.author.id;
    const user = db.prepare("SELECT points FROM users WHERE user_id = ?").get(userId);
    const points = user ? user.points : 0; 
    if(amount > points) {
      message.reply("You are too broke to gamble that amount. you are as broke as Martin.");
      return;
    }

    //check if choice is valid
    if (choice !== "heads" && choice !== "tails") {
      message.reply("Your choice must be either 'heads' or 'tails', idiot");
      return;
    }
    const result = coinflip();
    if (result === choice) {
      db.prepare("UPDATE users SET points = points + ? WHERE user_id = ?")
        .run(amount, userId);
      message.reply(`The coin landed on **${result}**! You won ${amount} points!`);
    } else {
      db.prepare("UPDATE users SET points = points - ? WHERE user_id = ?")
        .run(amount, userId);
      message.reply(`The coin landed on **${result}**! You lost ${amount} points!`);
    }




  }
  // Show leaderboard
  if (command === "leaderboard") {
    const top = db.prepare("SELECT user_id, points FROM users ORDER BY points DESC LIMIT 5").all();

    if (top.length === 0) {
      message.reply("No data yet. Speak more.");
      return;
    }

    const lines = top.map((row, i) => `${i + 1}. <@${row.user_id}> — ${row.points} pts`);
    message.channel.send("**Leaderboard**\n" + lines.join("\n"));
  }
}

// ---- Run bot ----
client.login(process.env.DISCORD_TOKEN);
