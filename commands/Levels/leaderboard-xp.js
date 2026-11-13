const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard-xp')
        .setDescription('Top 10 members by total XP'),
    async execute(interaction) {
        const rows = db.prepare(
            'SELECT user_id, level, xp FROM users WHERE guild_id = ? AND xp > 0 ORDER BY xp DESC LIMIT 10'
        ).all(interaction.guildId);

        if (!rows.length) return interaction.reply('No XP data yet.');

        const lines = rows
            .map((r, i) => `**${i + 1}.** <@${r.user_id}> — Lvl **${r.level}** · ${r.xp} XP`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🏆 XP Leaderboard')
            .setColor(0xFEE75C)
            .setDescription(lines);

        await interaction.reply({ embeds: [embed] });
    },
};