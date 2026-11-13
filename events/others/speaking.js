const { Events } = require('discord.js');
const { markSpeaking } = require('../../utils/voice');

module.exports = {
    name: Events.Speaking ?? 'speaking',
    execute(speaking) {
        if (speaking?.speaking && speaking.guildId) {
            markSpeaking(speaking.guildId, speaking.userId);
        }
    },
};