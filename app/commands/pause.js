const { SlashCommandBuilder } = require('discord.js');
const { pause } = require('./voice/voice');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pauses the current song'),

  async execute(interaction) {
    await interaction.deferReply();
    await pause(interaction)
  }
}
