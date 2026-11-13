const db = require('./database');

const BASE_XP_PER_MESSAGE = 1;
const BASE_XP_PER_VOICE_MINUTE = 5;
const BOOSTER_ROLE_ID = '1570531092702957721';
const BOOSTER_MULTIPLIER = 1.5;
const VANITY_ROLE_ID = '1570812942323032134';
const VANITY_MULTIPLIER = 1.2;

// ─────────────────────────────────────────────────────────────
// Level curve: Atom Original  →  Level = floor(0.1 * sqrt(XP))
// Inverse:                       XP    = (Level * 10)^2
// ─────────────────────────────────────────────────────────────

function totalXpForLevel(level) {
    return Math.pow(level * 10, 2);
}

function levelFromXp(totalXp) {
    return Math.floor(0.1 * Math.sqrt(Math.max(0, totalXp)));
}

function xpForNextLevel(level) {
    return totalXpForLevel(level + 1) - totalXpForLevel(level);
}

function progressFromXp(totalXp) {
    const level = levelFromXp(totalXp);
    const base = totalXpForLevel(level);
    const needed = xpForNextLevel(level);
    return { level, current: totalXp - base, needed, totalXp };
}

// ─────────────────────────────────────────────────────────────
// Multipliers
// ─────────────────────────────────────────────────────────────

function streakMultiplier(streak) {
    return 1 + Math.max(0, streak) * 0.01;
}

/**
 * Apply booster × vanity × streak multipliers and floor the result.
 * @param {number} baseXp
 * @param {{ isBooster: boolean, hasVanity: boolean, streak: number }} opts
 */
function applyMultipliers(baseXp, { isBooster, hasVanity, streak }) {
    const boost = isBooster ? BOOSTER_MULTIPLIER : 1;
    const vanity = hasVanity ? VANITY_MULTIPLIER : 1;
    const streakMult = streakMultiplier(streak);
    return Math.floor(baseXp * boost * vanity * streakMult);
}

// ─────────────────────────────────────────────────────────────
// XP granting
// ─────────────────────────────────────────────────────────────

/**
 * Adds XP to a user, recomputes level.
 * Pass { isBooster, hasVanity, streak } — the caller determines role flags.
 */
function grantXp(guildId, userId, baseXp, { isBooster, hasVanity, streak }) {
    const gained = applyMultipliers(baseXp, { isBooster, hasVanity, streak });
    if (gained <= 0) return { xpGained: 0 };

    db.prepare(`
      INSERT INTO users (user_id, guild_id) VALUES (?, ?)
      ON CONFLICT(user_id, guild_id) DO NOTHING
    `).run(userId, guildId);

    const before = db.prepare(
        'SELECT xp, level FROM users WHERE user_id = ? AND guild_id = ?'
    ).get(userId, guildId);

    const newTotal = before.xp + gained;
    const newLevel = levelFromXp(newTotal);

    db.prepare(`
      UPDATE users SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?
    `).run(newTotal, newLevel, userId, guildId);

    return {
        xpGained: gained,
        oldLevel: before.level,
        newLevel,
        leveledUp: newLevel > before.level,
        totalXp: newTotal,
        level: newLevel,
    };
}

module.exports = {
    BASE_XP_PER_MESSAGE,
    BASE_XP_PER_VOICE_MINUTE,
    BOOSTER_ROLE_ID,
    BOOSTER_MULTIPLIER,
    VANITY_ROLE_ID,
    VANITY_MULTIPLIER,
    totalXpForLevel,
    levelFromXp,
    xpForNextLevel,
    progressFromXp,
    streakMultiplier,
    applyMultipliers,
    grantXp,
};