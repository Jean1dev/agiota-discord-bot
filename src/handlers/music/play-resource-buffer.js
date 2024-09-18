const fs = require('fs')
const path = require('path')
const {
    entersState,
    createAudioResource,
    StreamType,
    AudioPlayerStatus,
} = require('@discordjs/voice');
const connectUserChannel = require('../../audio/connect-user-channel');
const audioPlayer = require('../../audio/audio-player');

async function playMusicByBuffer(buffer) {
    const speechFile = path.resolve("./speech.mp3");
    await fs.promises.writeFile(speechFile, buffer);

    const resource = createAudioResource(speechFile, {
        inputType: StreamType.Arbitrary,
    });

    audioPlayer.play(resource);

    return entersState(audioPlayer, AudioPlayerStatus.Playing, 5000);
}

async function runMusicBuffer(channel, buffer) {
    try {
        const connection = await connectUserChannel(channel);
        await playMusicByBuffer(buffer);
        connection.subscribe(audioPlayer);
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    runMusicBuffer
}