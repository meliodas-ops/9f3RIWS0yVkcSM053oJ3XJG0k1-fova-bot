require('dotenv').config();
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { getAllJsFiles } = require('./utils/readFiles');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();

// --- Load Commands (recursive, any depth) ---
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = getAllJsFiles(commandsPath);

for (const filePath of commandFiles) {
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] ${filePath} is missing "data" or "execute".`);
    }
}

// --- Load Events (recursive, any depth) ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = getAllJsFiles(eventsPath);

for (const filePath of eventFiles) {
    const event = require(filePath);
    if (!event.name || !event.execute) {
        console.log(`[WARNING] ${filePath} is missing "name" or "execute".`);
        continue;
    }
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

console.log(`Loaded ${client.commands.size} commands and ${eventFiles.length} events.`);

client.login(process.env.DISCORD_TOKEN);