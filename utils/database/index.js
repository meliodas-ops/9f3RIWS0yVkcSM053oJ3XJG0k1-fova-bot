const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../bot.db'));

// Pragmas for durability + speed
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Per-member, per-guild progression
  CREATE TABLE IF NOT EXISTS users (
    user_id       TEXT NOT NULL,
    guild_id      TEXT NOT NULL,
    xp            INTEGER DEFAULT 0,        -- total accumulated XP
    level         INTEGER DEFAULT 0,        -- derived but cached for fast queries
    streak        INTEGER DEFAULT 0,        -- current streak in days
    last_streak_day TEXT,                   -- YYYY-MM-DD of last qualifying message
    last_warn_day TEXT,                     -- YYYY-MM-DD of last expiry DM sent
    PRIMARY KEY (user_id, guild_id)
  );

  -- Daily message counters (one row per member per day)
  CREATE TABLE IF NOT EXISTS daily_messages (
    guild_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    day       TEXT NOT NULL,                -- YYYY-MM-DD (Warsaw)
    count     INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, day)
  );

  -- Daily voice seconds (one row per member per day)
  CREATE TABLE IF NOT EXISTS daily_voice (
    guild_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    day       TEXT NOT NULL,                -- YYYY-MM-DD (Warsaw)
    seconds   INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id, day)
  );

  -- Active voice sessions (for midnights split + abuse checks)
  CREATE TABLE IF NOT EXISTS voice_sessions (
    guild_id     TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    channel_id   TEXT NOT NULL,
    started_at   INTEGER NOT NULL,          -- unix ms
    last_tick_at INTEGER NOT NULL,          -- unix ms of last verified second
    PRIMARY KEY (guild_id, user_id)
  );

  -- Generic key/value for bot state (e.g. last hourly post timestamp)
  CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_daily_messages_day ON daily_messages (guild_id, day);
  CREATE INDEX IF NOT EXISTS idx_daily_voice_day    ON daily_voice    (guild_id, day);
  CREATE INDEX IF NOT EXISTS idx_users_streak       ON users (guild_id, streak DESC);
  CREATE INDEX IF NOT EXISTS idx_users_level        ON users (guild_id, level DESC);
`);

module.exports = db;