const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Get a random meme from Reddit'),
    async execute(interaction) {
        await interaction.deferReply();
        try {
            const res = await fetch('https://meme-api.com/gimme');
            const data = await res.json();
            await interaction.editReply({ content: data.title, files: [data.url] });
        } catch (err) {
            console.error(err);
            await interaction.editReply('Failed to fetch a meme 😢');
        }
    },
};