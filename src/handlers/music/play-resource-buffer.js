const fs = require('fs')
const path = require('path')
const createDiscordJSAdapter = require('../../adapters/discord-adapter')
const {
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    AudioPlayerStatus,
} = require('@discordjs/voice')

const player = createAudioPlayer();

async function connectToChannel(channel) {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: createDiscordJSAdapter(channel),
    });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

        return connection;
    } catch (error) {

        connection.destroy();
        throw error;
    }
}

async function playMusicBuffer(buffer) {
    const speechFile = path.resolve("./speech.mp3");
    await fs.promises.writeFile(speechFile, buffer);

    const resource = createAudioResource(buffer, {
        inputType: StreamType.Arbitrary,
    });

    player.play(resource);

    return entersState(player, AudioPlayerStatus.Playing, 5000);
}

async function runMusicBuffer(channel, buffer) {
    try {
        const connection = await connectToChannel(channel);
        await playMusicBuffer(buffer);
        connection.subscribe(player);
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    runMusicBuffer
}