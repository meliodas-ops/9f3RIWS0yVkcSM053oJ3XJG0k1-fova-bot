const db = require('./database');

const KEY = 'png_hourly_last_post';

/** Read the last posted unix-ms timestamp. Returns 0 if never. */
function getLastPostMs() {
    const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(KEY);
    return row ? Number(row.value) : 0;
}

/** Persist the last posted unix-ms timestamp. */
function setLastPostMs(ms) {
    db.prepare(`
      INSERT INTO kv (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(KEY, String(ms));
}

module.exports = { getLastPostMs, setLastPostMs };