const { GuildMember, MessageEmbed } = require('discord.js')
const Track = require('./track')
const MusicSubscription = require('./subcription')
const Context = require('../../context').contextInstance()
const { 
    joinVoiceChannel, 
    entersState, 
    VoiceConnectionStatus,
    AudioPlayerStatus
} = require('@discordjs/voice')

const subscriptions = new Map();
let playerLigado = false

const gifDj = 'https://i.imgur.com/z7R8T.gif';

// async function myImpl(args, message) {
//     const url = args[0]
//     const channel = message.member?.voice.channel
//     try {
//         const subscription = new MusicSubscription(
//             joinVoiceChannel({
//                 channelId: channel.id,
//                 guildId: channel.guild.id,
//                 adapterCreator: channel.guild.voiceAdapterCreator,
//             }),
//         );

//         await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);

//         // Attempt to create a Track from the user's video URL
//         const track = await Track.from(url, {
//             onStart() {
//                 message.channel.send('Now playing!')
//             },
//             onFinish() {
//                 message.channel.send('Now finished!')
//             },
//             onError(error) {
//                 console.warn(error);
//                 message.channel.send(`Error: ${error.message}`)
//             },
//         });
//         // Enqueue the track and reply a success message to the user
//         subscription.enqueue(track);
//     } catch (error) {
//         console.warn(error);

//         return;
//     }
// }

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
    ]);

    // Criar um objeto de incorporação
    const embed = new MessageEmbed()
        .setTitle('Player de música ligado!')
        .setDescription('Use / para visualizar todas as opções')
        .setImage(gifDj);

    // Envia a incorporação como mensagem
    message.channel.send({ embeds: [embed] });

    Context.client.on('interactionCreate', async (interaction) => {
        if (!interaction.isCommand() || !interaction.guildId) return;
        let subscription = subscriptions.get(interaction.guildId);

        if (interaction.commandName === 'play') {
            await interaction.deferReply();
            // Extract the video URL from the command
            const url = interaction.options.get('song').value;

            // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
            // and create a subscription.
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
                await interaction.followUp('Failed to play track, please try again later!');
            }
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
        } else {
            await interaction.reply('Unknown command');
        }
    });

    //return myImpl(args, message)

}
