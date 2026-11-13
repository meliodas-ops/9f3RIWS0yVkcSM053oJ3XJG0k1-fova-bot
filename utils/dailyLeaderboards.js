const { EmbedBuilder } = require('discord.js');
const db = require('./database');

const MAIN_CHANNEL_ID = '1570493426041098363';

const MSG_CHANNEL_ID = process.env.LEADERBOARD_MESSAGES_CHANNEL_ID;
const VOICE_CHANNEL_ID = process.env.LEADERBOARD_VOICE_CHANNEL_ID;
const PLACEHOLDER = 'REPLACE_ME';

// ─── Formatting helpers ──────────────────────────────────────
function formatDate(dayStr) {
    const [y, m, d] = dayStr.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Warsaw',
        day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function formatVoice(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ─── Queries ─────────────────────────────────────────────────
function topMessages(guildId, day) {
    return db.prepare(`
      SELECT user_id, count FROM daily_messages
      WHERE guild_id = ? AND day = ?
      ORDER BY count DESC LIMIT 10
    `).all(guildId, day);
}

function topVoice(guildId, day) {
    return db.prepare(`
      SELECT user_id, seconds FROM daily_voice
      WHERE guild_id = ? AND day = ? AND seconds > 0
      ORDER BY seconds DESC LIMIT 10
    `).all(guildId, day);
}

// ─── Embeds ──────────────────────────────────────────────────
function buildMessageEmbed(day, rows) {
    const title = `📨 Daily Messages — ${formatDate(day)}`;
    if (!rows.length) {
        return new EmbedBuilder()
            .setTitle(title)
            .setColor(0x5865F2)
            .setDescription('No messages were sent yesterday.');
    }
    const lines = rows
        .map((r, i) => `**${i + 1}.** <@${r.user_id}> — **${r.count}** message${r.count === 1 ? '' : 's'}`)
        .join('\n');
    return new EmbedBuilder()
        .setTitle(title)
        .setColor(0x5865F2)
        .setDescription(lines)
        .setFooter({ text: 'Messages in the main channel' });
}

function buildVoiceEmbed(day, rows) {
    const title = `🎙️ Daily Voice Activity — ${formatDate(day)}`;
    if (!rows.length) {
        return new EmbedBuilder()
            .setTitle(title)
            .setColor(0x57F287)
            .setDescription('No eligible voice activity yesterday.');
    }
    const lines = rows
        .map((r, i) => `**${i + 1}.** <@${r.user_id}> — **${formatVoice(r.seconds)}**`)
        .join('\n');
    return new EmbedBuilder()
        .setTitle(title)
        .setColor(0x57F287)
        .setDescription(lines)
        .setFooter({ text: 'Unmuted, not alone, not in AFK' });
}

// ─── Posting ─────────────────────────────────────────────────
async function postFor(guild, channelId, embed) {
    if (!channelId || channelId === PLACEHOLDER) return false;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
        console.warn(`[daily] channel ${channelId} not found in guild ${guild.id}`);
        return false;
    }
    try {
        await channel.send({ embeds: [embed] });
        return true;
    } catch (err) {
        console.error(`[daily] post failed in ${channelId}:`, err);
        return false;
    }
}

async function postDailyLeaderboards(guild, dayKeyStr) {
    const msgRows = topMessages(guild.id, dayKeyStr);
    const voiceRows = topVoice(guild.id, dayKeyStr);
    await postFor(guild, MSG_CHANNEL_ID, buildMessageEmbed(dayKeyStr, msgRows));
    await postFor(guild, VOICE_CHANNEL_ID, buildVoiceEmbed(dayKeyStr, voiceRows));
}

module.exports = {
    postDailyLeaderboards,
    formatDate,
    formatVoice,
    topMessages,
    topVoice,
    MSG_CHANNEL_ID,
    VOICE_CHANNEL_ID,
};