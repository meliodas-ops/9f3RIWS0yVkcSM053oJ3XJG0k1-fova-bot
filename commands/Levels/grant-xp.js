const { SlashCommandBuilder } = require('discord.js');
const { grantXp } = require('../../utils/xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('grant-xp')
        .setDescription('[dev] Add raw base XP to a user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Base XP (no multipliers)').setRequired(true)),
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '❌ Not authorized.', ephemeral: true });
        }
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const r = grantXp(interaction.guildId, target.id, amount, {
            isBooster: false,
            hasVanity: false,
            streak: 0,
        });
        await interaction.reply(`Gave **${r.xpGained}** XP to ${target.tag} (new level: **${r.newLevel}**).`);
    },
};