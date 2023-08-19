const { SlashCommandBuilder } = require('discord.js');
const { queue } = require('./voice/voice');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the current queue'),

  async execute(interaction) {
    await interaction.deferReply();
    await queue(interaction)
  }
}
