const { SlashCommandBuilder } = require('discord.js');
const { play } = require('./voice/voice');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Add a song to the queue')
    .addStringOption(option =>
      option.setName('search')
        .setDescription('Search query for youtube')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    await play(interaction, interaction.options.get('search').value)
  }
}
