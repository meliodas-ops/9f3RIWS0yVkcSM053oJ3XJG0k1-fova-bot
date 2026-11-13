const db = require('./database');
const { dayKey, daysBetween } = require('./time');

/**
 * Updates the streak and daily message count for a member.
 * Returns { streak, isNewDay, prevStreak, reset }
 */
function recordMessage(guildId, userId, now = new Date()) {
    const today = dayKey(now);

    // Ensure the user row exists
    db.prepare(`
      INSERT INTO users (user_id, guild_id) VALUES (?, ?)
      ON CONFLICT(user_id, guild_id) DO NOTHING
    `).run(userId, guildId);

    const row = db.prepare(
        'SELECT streak, last_streak_day FROM users WHERE user_id = ? AND guild_id = ?'
    ).get(userId, guildId);

    let streak = row.streak ?? 0;
    let reset = false;

    if (row.last_streak_day === today) {
        // Already messaged today — streak unchanged
    } else {
        if (row.last_streak_day) {
            const gap = daysBetween(row.last_streak_day, today);
            if (gap === 1) {
                streak += 1;
            } else if (gap > 1) {
                streak = 1;   // missed a day → reset, today starts new streak
                reset = true;
            } else {
                streak = 1;   // clock went backwards; treat as new
            }
        } else {
            streak = 1;       // first ever qualifying message
        }

        db.prepare(`
          UPDATE users SET streak = ?, last_streak_day = ?
          WHERE user_id = ? AND guild_id = ?
        `).run(streak, today, userId, guildId);
    }

    // Daily message counter (used by Step 5 leaderboards)
    db.prepare(`
      INSERT INTO daily_messages (guild_id, user_id, day, count) VALUES (?, ?, ?, 1)
      ON CONFLICT(guild_id, user_id, day) DO UPDATE SET count = count + 1
    `).run(guildId, userId, today);

    return { streak, isNewDay: row.last_streak_day !== today, prevStreak: row.streak ?? 0, reset };
}

module.exports = { recordMessage };