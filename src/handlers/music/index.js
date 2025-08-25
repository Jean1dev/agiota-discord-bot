const { GuildMember, MessageEmbed } = require('discord.js')
const Track = require('./track')
const MusicSubscription = require('./subcription')
const { contextInstance } = require('../../context')
const {
    joinVoiceChannel,
    entersState,
    VoiceConnectionStatus,
    AudioPlayerStatus
} = require('@discordjs/voice')
const { addMusic, ramdomMusic } = require('../../services')
const { textToSpeech } = require('../../ia/open-ai-api')
const { runMusicBuffer } = require('./play-resource-buffer')

const subscriptions = new Map();
let playerLigado = false

const gifDj = 'https://i.imgur.com/z7R8T.gif';

async function playSong(url, subscription, interaction, subscriptions) {
    if (!subscription) {
        if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
            const channel = interaction.member.voice.channel;
            subscription = new MusicSubscription(
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                }),
            );
            subscription.voiceConnection.on('error', console.warn);
            subscriptions.set(interaction.guildId, subscription);
        }
    }

    // If there is no subscription, tell the user they need to join a channel.
    if (!subscription) {
        await interaction.followUp('Join a voice channel and then try that again!');
        return;
    }

    // Make sure the connection is ready before processing the user's request
    try {
        await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
    } catch (error) {
        console.warn(error);
        await interaction.followUp('Failed to join voice channel within 20 seconds, reiniciando processo');
        process.exit(0);
    }

    try {
        // Attempt to create a Track from the user's video URL
        const track = await Track.from(url, {
            onStart() {
                interaction.followUp({ content: 'Now playing!', ephemeral: true }).catch(console.warn);
            },
            onFinish() {
                interaction.followUp({ content: 'Now finished!', ephemeral: true }).catch(console.warn);
            },
            onError(error) {
                console.warn(error);
                interaction.followUp({ content: `Error: ${error.message}`, ephemeral: true }).catch(console.warn);
            },
        });
        // Enqueue the track and reply a success message to the user
        subscription.enqueue(track);
        await interaction.followUp(`Enqueued **${track.title}**`);
    } catch (error) {
        console.warn(error);
        let errorMessage = 'Failed to play track, please try again later!';
        
        if (error.message.includes('Sign in to confirm you\'re not a bot')) {
            errorMessage = 'YouTube is temporarily blocking requests. Please try again in a few minutes.';
        } else if (error.message.includes('Video unavailable')) {
            errorMessage = 'This video is unavailable or private.';
        } else if (error.message.includes('Video is private')) {
            errorMessage = 'This video is private and cannot be played.';
        } else if (error.message.includes('Video is age restricted')) {
            errorMessage = 'This video is age restricted and cannot be played.';
        }
        
        await interaction.followUp(errorMessage);
    }
}

module.exports = async (message) => {
    if (!message.guild) return;

    if (playerLigado) {
        message.reply('O player ja esta ligado, utilize o /play musica para tocar um som')
        return
    }

    playerLigado = true

    await message.guild.commands.set([
        {
            name: 'play',
            description: 'Plays a song',
            options: [
                {
                    name: 'song',
                    type: 'STRING',
                    description: 'The URL of the song to play',
                    required: true,
                },
            ],
        },
        {
            name: 'skip',
            description: 'Skip to the next song in the queue',
        },
        {
            name: 'queue',
            description: 'See the music queue',
        },
        {
            name: 'pause',
            description: 'Pauses the song that is currently playing',
        },
        {
            name: 'resume',
            description: 'Resume playback of the current song',
        },
        {
            name: 'leave',
            description: 'Leave the voice channel',
        },
        {
            name: 'random',
            description: 'Play random music',
        },
        {
            name: 'talk-to-me',
            description: 'Conversa com o mamaco',
            options: [
                {
                    name: 'input',
                    type: 'STRING',
                    description: 'Sobre oq vamos conversar?',
                    required: true,
                },
            ],
        },
    ]);

    // Criar um objeto de incorporação
    const embed = new MessageEmbed()
        .setTitle('Player de música ligado!')
        .setDescription('Use / para visualizar todas as opções')
        .setImage(gifDj);

    // Envia a incorporação como mensagem
    message.channel.send({ embeds: [embed] });

    const context = contextInstance()
    context.client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand() || !interaction.guildId) return;
        let subscription = subscriptions.get(interaction.guildId);

        if (interaction.commandName === 'play') {
            await interaction.deferReply();
            // Extract the video URL from the command
            const url = interaction.options.get('song').value;
            addMusic(url)
            // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
            // and create a subscription.
            await playSong(url, subscription, interaction, subscriptions)

        } else if (interaction.commandName === 'skip') {
            if (subscription) {
                // Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
                // listener defined in music/subscription.ts, transitions into the Idle state mean the next track from the queue
                // will be loaded and played.
                subscription.audioPlayer.stop();
                await interaction.reply('Skipped song!');
            } else {
                await interaction.reply('Not playing in this server!');
            }
        } else if (interaction.commandName === 'queue') {
            // Print out the current queue, including up to the next 5 tracks to be played.
            if (subscription) {
                const current =
                    subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
                        ? `Nothing is currently playing!`
                        : `Playing **${(subscription.audioPlayer.state.resource).metadata.title}**`;

                const queue = subscription.queue
                    .slice(0, 5)
                    .map((track, index) => `${index + 1}) ${track.title}`)
                    .join('\n');

                await interaction.reply(`${current}\n\n${queue}`);
            } else {
                await interaction.reply('Not playing in this server!');
            }
        } else if (interaction.commandName === 'pause') {
            if (subscription) {
                subscription.audioPlayer.pause();
                await interaction.reply({ content: `Paused!`, ephemeral: true });
            } else {
                await interaction.reply('Not playing in this server!');
            }
        } else if (interaction.commandName === 'resume') {
            if (subscription) {
                subscription.audioPlayer.unpause();
                await interaction.reply({ content: `Unpaused!`, ephemeral: true });
            } else {
                await interaction.reply('Not playing in this server!');
            }
        } else if (interaction.commandName === 'leave') {
            if (subscription) {
                subscription.voiceConnection.destroy();
                subscriptions.delete(interaction.guildId);
                await interaction.reply({ content: `Left channel!`, ephemeral: true });
            } else {
                await interaction.reply('Not playing in this server!');
            }

        } else if (interaction.commandName === 'random') {
            await interaction.deferReply();
            const musicEscolhida = await ramdomMusic()

            if (musicEscolhida === '') {
                await interaction.followUp('Nenhuma musica salva!');
                return
            }

            await playSong(musicEscolhida, subscription, interaction, subscriptions)

        } else if (interaction.commandName === 'talk-to-me') {
            await interaction.deferReply();
            const inputText = interaction.options.get('input').value;
            const audioBuffer = await textToSpeech(inputText)
            const channel = interaction.member.voice.channel;
            await runMusicBuffer(channel, audioBuffer)
            await interaction.followUp('eita po');

        } else {
            await interaction.reply('Unknown command');
        }
    });

    //return myImpl(args, message)

}
