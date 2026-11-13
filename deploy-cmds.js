require('dotenv').config();
const path = require('path');
const { REST, Routes } = require('discord.js');
const { getAllJsFiles } = require('./utils/readFiles');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = getAllJsFiles(commandsPath);

for (const filePath of commandFiles) {
    const command = require(filePath);
    if ('data' in command) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Refreshing ${commands.length} slash commands...`);
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );
        console.log(`Successfully reloaded ${data.length} commands.`);
    } catch (error) {
        console.error(error);
    }
})();