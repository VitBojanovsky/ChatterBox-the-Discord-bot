require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("points")
    .setDescription("Show your points"),

  new SlashCommandBuilder()
    .setName("give")
    .setDescription("Give points to another user")
    .addUserOption(option =>
      option.setName("target")
            .setDescription("User to give points to")
            .setRequired(true))
    .addIntegerOption(option =>
      option.setName("amount")
            .setDescription("Amount of points")
            .setRequired(true)),

  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin to gamble points")
    .addIntegerOption(option =>
      option.setName("amount")
            .setDescription("Points to gamble")
            .setRequired(true))
    .addStringOption(option =>
      option.setName("choice")
            .setDescription("Heads or tails")
            .setRequired(true)
            .addChoices(
              { name: "Heads", value: "heads" },
              { name: "Tails", value: "tails" }
            )),

  new SlashCommandBuilder()
    .setName("diceroll")
    .setDescription("Roll a dice to gamble points")
    .addIntegerOption(option =>
      option.setName("amount")
            .setDescription("Points to gamble")
            .setRequired(true))
    .addIntegerOption(option =>
      option.setName("choice")
            .setDescription("Number between 1-6")
            .setRequired(true)),

  new SlashCommandBuilder()
    .setName("spin")
    .setDescription("Play the slot machine")
    .addIntegerOption(option =>
      option.setName("amount")
            .setDescription("Points to gamble")
            .setRequired(true)),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show top points leaderboard"),
  
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show help information"),

  new SlashCommandBuilder()
      .setName("shop")
      .setDescription("Show the shop"),
  
  new SlashCommandBuilder()
      .setName("buy")
      .setDescription("Buy an item from the shop")
      .addStringOption(option =>
          option.setName("item")
                .setDescription("Item to buy")
                .setRequired(true))
    
]
.map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Refreshing slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // global commands
      { body: commands }
    );
    console.log("Slash commands registered globally (may take up to 1 hour to appear).");
  } catch (err) {
    console.error(err);
  }
})();
