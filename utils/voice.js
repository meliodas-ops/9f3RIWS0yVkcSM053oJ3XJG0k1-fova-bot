const db = require('./database');
const { dayKey } = require('./time');

// In-memory "last spoke" map, resets on restart (which is fine — restarting
// just means members need to speak again).
// key = `${guildId}:${userId}`, value = unix ms
const lastSpokeAt = new Map();

const SPEAKING_GRACE_TICKS = 3;
const TICK_MS = 60_000;

/** Called by the `speaking` event when a user starts talking. */
function markSpeaking(guildId, userId) {
    lastSpokeAt.set(`${guildId}:${userId}`, Date.now());
}

/** True if the user spoke within the grace window. */
function spokeRecently(guildId, userId) {
    const t = lastSpokeAt.get(`${guildId}:${userId}`);
    if (!t) return false;
    return Date.now() - t < SPEAKING_GRACE_TICKS * TICK_MS + 5_000;
}

/**
 * Decide if a member earns voice XP this tick.
 * Returns { eligible, reason? }.
 */
function isEligibleVoice(member, guild, voiceState) {
    if (!voiceState?.channelId) return { eligible: false, reason: 'not-in-voice' };
    if (voiceState.selfDeaf) return { eligible: false, reason: 'self-deaf' };
    if (voiceState.selfMute) return { eligible: false, reason: 'self-mute' };
    if (voiceState.serverDeaf) return { eligible: false, reason: 'server-deaf' };
    if (voiceState.serverMute) return { eligible: false, reason: 'server-mute' };
    if (voiceState.channelId === guild.afkChannelId) {
        return { eligible: false, reason: 'afk-channel' };
    }

    const channel = guild.channels.cache.get(voiceState.channelId);
    if (!channel) return { eligible: false, reason: 'no-channel' };

    // Not alone: at least one other non-bot member in the channel
    const others = channel.members.filter(m => !m.user.bot && m.id !== member.id);
    if (others.size === 0) return { eligible: false, reason: 'alone' };

    // Activity: currently speaking, or spoke in the last few ticks
    const speakingNow = voiceState.speaking === true;
    const spokeRecentlyFlag = spokeRecently(guild.id, member.id);
    if (!speakingNow && !spokeRecentlyFlag) {
        return { eligible: false, reason: 'silent' };
    }

    return { eligible: true };
}

/** Unix ms of the first Europe/Warsaw midnight strictly after `ms`. */
function nextWarsawMidnight(ms) {
    const d = new Date(ms);
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Warsaw',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(d);

    const get = t => Number(parts.find(p => p.type === t).value);
    const local = Date.UTC(
        get('year'), get('month') - 1, get('day'),
        get('hour'), get('minute'), get('second'),
    );
    const offsetMs = local - ms; // Warsaw wall clock minus UTC ms

    const tomorrowLocal = Date.UTC(
        get('year'), get('month') - 1, get('day') + 1, 0, 0, 0,
    );
    return tomorrowLocal - offsetMs;
}

/**
 * Add voice seconds for a time interval, splitting across Warsaw midnights.
 * Uses daily_voice rows keyed by YYYY-MM-DD in Europe/Warsaw.
 */
function addVoiceSeconds(guildId, userId, seconds, fromMs, toMs) {
    let cursor = fromMs;
    while (cursor < toMs) {
        const dayOfCursor = dayKey(new Date(cursor));
        const nextMidnight = nextWarsawMidnight(cursor);
        const chunkEnd = Math.min(toMs, nextMidnight);
        const chunkSec = Math.round((chunkEnd - cursor) / 1000);
        if (chunkSec > 0) {
            db.prepare(`
              INSERT INTO daily_voice (guild_id, user_id, day, seconds) VALUES (?, ?, ?, ?)
              ON CONFLICT(guild_id, user_id, day) DO UPDATE SET seconds = seconds + excluded.seconds
            `).run(guildId, userId, dayOfCursor, chunkSec);
        }
        cursor = chunkEnd;
    }
}

module.exports = {
    markSpeaking,
    spokeRecently,
    isEligibleVoice,
    addVoiceSeconds,
    nextWarsawMidnight,
    TICK_MS,
};