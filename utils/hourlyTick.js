const { buildPngEmbed } = require('./pngEmbed');
const { getLastPostMs, setLastPostMs } = require('./hourly');

const MAIN_CHANNEL_ID = '1570493426041098363';
const HOUR_MS = 60 * 60 * 1000;

/**
 * Called every 5 minutes. If an hour has passed since the last post,
 * send the reminder. Using a 5-minute polling interval means the embed
 * may appear up to 5 minutes after the top of the hour — if you want it
 * exactly on the hour, we can schedule with a precise setTimeout to the
 * next HH:00 instead.
 */
async function runHourlyTick(client) {
    const last = getLastPostMs();
    const now = Date.now();
    if (now - last < HOUR_MS - 60_000) return; // not due yet

    for (const [, guild] of client.guilds.cache) {
        const channel = guild.channels.cache.get(MAIN_CHANNEL_ID);
        if (!channel) continue;
        try {
            await channel.send({ embeds: [buildPngEmbed()] });
        } catch (err) {
            console.error(`[hourly] ${guild.id}:`, err);
        }
    }

    setLastPostMs(now);
}

module.exports = { runHourlyTick };