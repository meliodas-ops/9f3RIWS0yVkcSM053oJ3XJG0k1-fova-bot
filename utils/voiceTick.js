const db = require('./database');
const { isEligibleVoice, addVoiceSeconds } = require('./voice');
const {
    grantXp,
    BASE_XP_PER_VOICE_MINUTE,
    BOOSTER_ROLE_ID,
    VANITY_ROLE_ID,
} = require('./xp');
const { grantRolesForLevel } = require('./roles');

const MAIN_CHANNEL_ID = '1570493426041098363';

async function runVoiceTick(guild, client, nowMs = Date.now()) {
    const tickStart = nowMs - 60_000;

    const eligible = [];
    for (const [, voiceState] of guild.voiceStates.cache) {
        const member = voiceState.member;
        if (!member || member.user.bot) continue;
        if (!voiceState.channelId) continue;
        const check = isEligibleVoice(member, guild, voiceState);
        if (check.eligible) eligible.push({ member, voiceState });
    }

    if (!eligible.length) {
        cleanupSessions(guild.id, new Set());
        return;
    }

    const upsertSession = db.prepare(`
      INSERT INTO voice_sessions (guild_id, user_id, channel_id, started_at, last_tick_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        channel_id = excluded.channel_id,
        last_tick_at = excluded.last_tick_at
    `);
    const getSession = db.prepare(
        'SELECT started_at FROM voice_sessions WHERE guild_id = ? AND user_id = ?'
    );

    const writeTx = db.transaction(() => {
        for (const { member, voiceState } of eligible) {
            addVoiceSeconds(guild.id, member.id, 60, tickStart, nowMs);
            const existing = getSession.get(guild.id, member.id);
            upsertSession.run(
                guild.id,
                member.id,
                voiceState.channelId,
                existing?.started_at ?? tickStart,
                nowMs,
            );
        }
    });
    writeTx();

    const getStreak = db.prepare(
        'SELECT streak FROM users WHERE user_id = ? AND guild_id = ?'
    );
    const main = guild.channels.cache.get(MAIN_CHANNEL_ID);

    for (const { member } of eligible) {
        const streak = getStreak.get(member.id, guild.id)?.streak ?? 0;
        const isBooster = member.roles.cache.has(BOOSTER_ROLE_ID);
        const hasVanity = member.roles.cache.has(VANITY_ROLE_ID);

        const r = grantXp(guild.id, member.id, BASE_XP_PER_VOICE_MINUTE, {
            isBooster,
            hasVanity,
            streak,
        });

        if (r.leveledUp) {
            await grantRolesForLevel(member, r.newLevel);
            main?.send({
                content: `🎙️ <@${member.id}> reached **level ${r.newLevel}** via voice activity!`,
            }).catch(() => { });
        }
    }

    cleanupSessions(guild.id, new Set(eligible.map(e => e.member.id)));
}

function cleanupSessions(guildId, stillInVoice) {
    const rows = db.prepare(
        'SELECT user_id FROM voice_sessions WHERE guild_id = ?'
    ).all(guildId);
    const del = db.prepare(
        'DELETE FROM voice_sessions WHERE guild_id = ? AND user_id = ?'
    );
    for (const r of rows) {
        if (!stillInVoice.has(r.user_id)) del.run(guildId, r.user_id);
    }
}

module.exports = { runVoiceTick };