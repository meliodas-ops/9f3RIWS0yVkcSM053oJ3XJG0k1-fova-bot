const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { LEVEL_ROLES } = require('../../utils/roles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level-roles')
        .setDescription('Show which roles unlock at which levels'),
    async execute(interaction) {
        const lines = LEVEL_ROLES
            .map(r => `**Lvl ${r.level}${r.level === 100 ? '+' : ''}** → <@&${r.roleId}>`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🎖️ Level Roles')
            .setDescription(lines)
            .setColor(0x57F287);

        await interaction.reply({ embeds: [embed] });
    },
};