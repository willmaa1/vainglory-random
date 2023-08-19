const { SlashCommandBuilder } = require('discord.js');
const { resume } = require('./voice/voice');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resumes the current song'),

  async execute(interaction) {
    await interaction.deferReply();
    await resume(interaction)
  }
}
