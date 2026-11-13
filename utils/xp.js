const db = require('./database');

// ─── Tunables ──────────────────────────────────────────────
const BASE_XP_MIN = 5;   // per qualifying message, random
const BASE_XP_MAX = 10;
const BASE_XP_PER_VOICE_MINUTE = 5;   // unchanged: 1 min voice = base 5 messages
const MESSAGE_XP_COOLDOWN_MS = 60_000;

const BOOSTER_ROLE_ID = '1570531092702957721';
const BOOSTER_MULTIPLIER = 1.5;
const VANITY_ROLE_ID = '1570812942323032134';
const VANITY_MULTIPLIER = 1.2;

// ─── Level curve: Atom Original → floor(0.1 * sqrt(XP)) ──
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

// ─── Multipliers ──────────────────────────────────────────
function streakMultiplier(streak) {
    return 1 + Math.max(0, streak) * 0.01;
}

function applyMultipliers(baseXp, { isBooster, hasVanity, streak }) {
    const boost = isBooster ? BOOSTER_MULTIPLIER : 1;
    const vanity = hasVanity ? VANITY_MULTIPLIER : 1;
    return Math.floor(baseXp * boost * vanity * streakMultiplier(streak));
}

// ─── Cooldown (in-memory) ─────────────────────────────────
// Map<`${guildId}:${userId}`, lastAwardMs>
const lastMessageXpAt = new Map();

/** True if the user is still on cooldown for message XP. */
function isOnMessageCooldown(guildId, userId, nowMs = Date.now()) {
    const t = lastMessageXpAt.get(`${guildId}:${userId}`);
    return t !== undefined && nowMs - t < MESSAGE_XP_COOLDOWN_MS;
}

/** Remaining cooldown ms (0 if off cooldown). */
function remainingMessageCooldown(guildId, userId, nowMs = Date.now()) {
    const t = lastMessageXpAt.get(`${guildId}:${userId}`);
    if (t === undefined) return 0;
    return Math.max(0, MESSAGE_XP_COOLDOWN_MS - (nowMs - t));
}

function markMessageXpAward(guildId, userId, nowMs = Date.now()) {
    lastMessageXpAt.set(`${guildId}:${userId}`, nowMs);
}

/** Returns a random integer in [min, max] inclusive. */
function randomBaseXp() {
    return Math.floor(Math.random() * (BASE_XP_MAX - BASE_XP_MIN + 1)) + BASE_XP_MIN;
}

// ─── XP granting ──────────────────────────────────────────
/**
 * Adds XP to a user, recomputes level.
 * @param {number} baseXp - already computed base (caller decides message vs voice)
 * @param {{ isBooster: boolean, hasVanity: boolean, streak: number }} opts
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
    BASE_XP_MIN,
    BASE_XP_MAX,
    BASE_XP_PER_VOICE_MINUTE,
    MESSAGE_XP_COOLDOWN_MS,
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
    isOnMessageCooldown,
    remainingMessageCooldown,
    markMessageXpAward,
    randomBaseXp,
    grantXp,
};