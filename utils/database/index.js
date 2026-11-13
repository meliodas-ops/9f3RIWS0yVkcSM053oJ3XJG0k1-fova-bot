const Database = require('better-sqlite3');
const path = require('path');

// Creates a database file at the project root
const db = new Database(path.join(__dirname, '../../bot.db'));

// Example: Initialize a table for guild settings or user data
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!'
  )
`);

module.exports = db;