const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const { progressFromXp, BOOSTER_ROLE_ID, VANITY_ROLE_ID } = require('../../utils/xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Show a member’s level and XP')
        .addUserOption(o => o.setName('target').setDescription('Whose rank to show')),
    async execute(interaction) {
        const target = interaction.options.getUser('target') ?? interaction.user;
        const row = db.prepare(
            'SELECT xp, level, streak FROM users WHERE user_id = ? AND guild_id = ?'
        ).get(target.id, interaction.guildId);

        const xp = row?.xp ?? 0;
        const streak = row?.streak ?? 0;
        const p = progressFromXp(xp);
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        const roles = member?.roles?.cache;
        const isBooster = roles?.has(BOOSTER_ROLE_ID) ?? false;
        const hasVanity = roles?.has(VANITY_ROLE_ID) ?? false;

        const embed = new EmbedBuilder()
            .setTitle(`${target.username}'s rank`)
            .setColor(0x5865F2)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: 'Level', value: `${p.level}`, inline: true },
                { name: 'Streak', value: `${streak} day(s)`, inline: true },
                { name: 'Booster', value: isBooster ? '✅ ×1.5' : '❌', inline: true },
                { name: 'Vanity', value: hasVanity ? '✅ ×1.2' : '❌', inline: true },
                { name: 'Progress', value: `${p.current} / ${p.needed} XP`, inline: false },
                { name: 'Total XP', value: `${p.totalXp}`, inline: false },
            );
        await interaction.reply({ embeds: [embed] });
    },
};