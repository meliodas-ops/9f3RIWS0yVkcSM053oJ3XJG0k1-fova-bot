const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const { grantRolesForLevel } = require('../../utils/roles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-roles')
        .setDescription('[dev] Backfill missing level roles for all members'),
    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '❌ Not authorized.', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });

        const rows = db.prepare(
            'SELECT user_id, level FROM users WHERE guild_id = ? AND level > 0'
        ).all(interaction.guildId);

        let updated = 0;
        for (const row of rows) {
            const member = await interaction.guild.members.fetch(row.user_id).catch(() => null);
            if (!member) continue;
            const added = await grantRolesForLevel(member, row.level);
            if (added.length) updated++;
        }

        await interaction.editReply(`✅ Synced. **${updated}** member(s) received new roles.`);
    },
};