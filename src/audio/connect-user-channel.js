const {
    VoiceConnectionStatus,
    joinVoiceChannel,
    entersState,
} = require('@discordjs/voice')
const createDiscordJSAdapter = require('../adapters/discord-adapter')

const connectUserChannel = async (channel) => {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        debug: true,
        adapterCreator: createDiscordJSAdapter(channel),
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30e3)
        return connection;
    } catch (error) {
        connection.destroy()
        throw error
    }
}

module.exports = connectUserChannel