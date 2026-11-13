const db = require('./database');
const { dayKey } = require('./time');
const { postDailyLeaderboards } = require('./dailyLeaderboards');

const KV_KEY = 'daily_leaderboard_last_post';

function getLastPostDay() {
    const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(KV_KEY);
    return row ? row.value : null;
}

function setLastPostDay(day) {
    db.prepare(`
      INSERT INTO kv (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(KV_KEY, day);
}

/** Previous calendar day (Warsaw) for a given Date. */
function yesterdayKey(now = new Date()) {
    const today = dayKey(now);
    const [y, m, d] = today.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1, 12));
    return dayKey(prev);
}

/**
 * Called every 60s. If a new Warsaw day has begun and we haven't posted the
 * previous day's leaderboards yet, do it for every guild.
 */
async function runDailyTick(client) {
    const today = dayKey();
    const last = getLastPostDay();
    if (last === today) return;   // already posted today

    const target = yesterdayKey();
    let anyPosted = false;

    for (const [, guild] of client.guilds.cache) {
        try {
            await postDailyLeaderboards(guild, target);
            anyPosted = true;
        } catch (err) {
            console.error(`[dailyTick] ${guild.id}:`, err);
        }
    }

    if (anyPosted) setLastPostDay(today);
}

module.exports = { runDailyTick, getLastPostDay, setLastPostDay, yesterdayKey };