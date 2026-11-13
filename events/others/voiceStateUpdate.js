const { Events } = require('discord.js');
const db = require('../../utils/database');

module.exports = {
    name: Events.VoiceStateUpdate,
    execute(oldState, newState) {
        const guildId = newState.guild?.id ?? oldState.guild?.id;
        const userId = newState.id ?? oldState.id;
        if (!guildId || !userId) return;

        const wasIn = !!oldState.channelId;
        const isIn = !!newState.channelId;

        // Left voice entirely → drop session
        if (wasIn && !isIn) {
            db.prepare(
                'DELETE FROM voice_sessions WHERE guild_id = ? AND user_id = ?'
            ).run(guildId, userId);
        }

        // Switched channels → reset started_at (a new session)
        if (wasIn && isIn && oldState.channelId !== newState.channelId) {
            db.prepare(
                'DELETE FROM voice_sessions WHERE guild_id = ? AND user_id = ?'
            ).run(guildId, userId);
        }
    },
};