const { EmbedBuilder } = require('discord.js');

const BOOSTER_ROLE_ID = '1570531092702957721';

function buildPngEmbed() {
    return new EmbedBuilder()
        .setTitle('PNG/GIF')
        .setDescription(
            `Wysyłanie obrazów PNG i GIF jest dostępne dla osób z rangą <@&${BOOSTER_ROLE_ID}> lub z poziomem 5 i wyższym.`,
        )
        .setColor(0xEB459E);
}

module.exports = { buildPngEmbed };