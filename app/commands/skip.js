const { SlashCommandBuilder, } = require('discord.js');
const { skip } = require('./voice/voice');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the current song'),

  async execute(interaction) {
    await interaction.deferReply();
    await skip(interaction)
  }
}
