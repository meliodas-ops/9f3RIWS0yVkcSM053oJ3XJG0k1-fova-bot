const { Events, MessageFlags } = require('discord.js');
const { recordMessage } = require('../../utils/streak');
const {
    grantXp,
    BASE_XP_PER_MESSAGE,
    BOOSTER_ROLE_ID,
    VANITY_ROLE_ID,
} = require('../../utils/xp');
const { grantRolesForLevel } = require('../../utils/roles');
const { buildPngEmbed } = require('../../utils/pngEmbed');

const MAIN_CHANNEL_ID = '1570565930377805954';
const PNG_REGEX = /\bPNG\b/i;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;
        if (message.channel.id !== MAIN_CHANNEL_ID) return;

        // ── PNG trigger ─────────────────────────────────────────
        if (PNG_REGEX.test(message.content)) {
            try {
                await message.reply({
                    embeds: [buildPngEmbed()],
                    flags: MessageFlags.Ephemeral,
                    allowedMentions: { parse: [] },
                });
            } catch (err) {
                console.error('[png trigger]', err);
            }
        }

        // ── Streak ─────────────────────────────────────────────
        const { streak, reset } = recordMessage(message.guild.id, message.author.id);
        if (reset) {
            message.channel.send({
                content: `🔁 <@${message.author.id}> your streak reset, but a new one just started: **1 day**.`,
            }).catch(() => { });
        }

        // ── XP ─────────────────────────────────────────────────
        const member = message.member;
        const roles = member?.roles?.cache;
        const isBooster = roles?.has(BOOSTER_ROLE_ID) ?? false;
        const hasVanity = roles?.has(VANITY_ROLE_ID) ?? false;

        const result = grantXp(message.guild.id, message.author.id, BASE_XP_PER_MESSAGE, {
            isBooster,
            hasVanity,
            streak,
        });

        if (result.leveledUp && member) {
            const added = await grantRolesForLevel(member, result.newLevel);
            const roleLine = added.length
                ? `\nRoles granted: ${added.map(id => `<@&${id}>`).join(' ')}`
                : '';
            message.channel.send({
                content: `🎉 <@${message.author.id}> reached **level ${result.newLevel}**!${roleLine}`,
            }).catch(() => { });
        }
    },
};