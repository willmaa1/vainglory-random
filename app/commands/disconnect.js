const { SlashCommandBuilder } = require('discord.js');
const { disconnect } = require('./voice/voice');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnects the bot from the current voice channel, clearing the queue'),

  async execute(interaction) {
    await interaction.deferReply();
    await disconnect(interaction)
  }
}
