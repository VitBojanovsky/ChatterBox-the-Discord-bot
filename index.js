// index.js
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const Database = require("better-sqlite3");

// ---- Discord setup ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const PREFIX = "!";

// ---- Database setup ----
const db = new Database("data.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    points INTEGER DEFAULT 0,
    last_message INTEGER DEFAULT 0
  )
`).run();

// ---- Bot events ----
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", message => {
  if (message.author.bot) return;

  handlePoints(message);
  handleCommands(message);
});

// ---- Functions ----
function handlePoints(message) {
  const userId = message.author.id;
  const now = Date.now();

  // Get user from DB
  let user = db.prepare("SELECT * FROM users WHERE user_id = ?").get(userId);

  // Insert user if they don't exist
  if (!user) {
    db.prepare("INSERT INTO users (user_id, points, last_message) VALUES (?, ?, ?)")
      .run(userId, 0, 0);
    user = { user_id: userId, points: 0, last_message: 0 };
  }

  // Cooldown and message length check
  const cooldown = 60 * 1000; // 1 minute
  if (now - user.last_message < cooldown) return;
  if (message.content.trim().length < 5) return;

  // Update points and last_message
  db.prepare("UPDATE users SET points = points + 1, last_message = ? WHERE user_id = ?")
    .run(now, userId);
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
