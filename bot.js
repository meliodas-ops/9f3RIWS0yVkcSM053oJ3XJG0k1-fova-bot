require('dotenv').config();
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { getAllJsFiles } = require('./utils/readFiles');
const { runVoiceTick } = require('./utils/voiceTick');
const { TICK_MS } = require('./utils/voice');
const { runHourlyTick } = require('./utils/hourlyTick');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.commands = new Collection();

// ─── Load Commands ─────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
for (const filePath of getAllJsFiles(commandsPath)) {
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        command.filePath = filePath;
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] ${filePath} is missing "data" or "execute".`);
    }
}

// ─── Load Events ───────────────────────────────────────────
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

// ─── Jobs ──────────────────────────────────────────────────
client.once(Events.ClientReady, () => {
    // Voice XP: every 60s
    setInterval(async () => {
        for (const [, guild] of client.guilds.cache) {
            try {
                await runVoiceTick(guild, client);
            } catch (err) {
                console.error(`[voiceTick] ${guild.id}:`, err);
            }
        }
    }, TICK_MS);

    // PNG hourly reminder: check every 5 min, fire when an hour has passed
    runHourlyTick(client); // immediate check on startup
    setInterval(() => runHourlyTick(client), 5 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);
console.log(`✅ Logged in`);