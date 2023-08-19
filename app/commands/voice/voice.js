const { PermissionsBitField } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, PlayerSubscription, VoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const ytstream = require('yt-stream')

// Map queues by guild
const allQueues = new Map()

const playNext = async (guildId) => {
    const connection = getVoiceConnection(guildId)
    const queue = allQueues.get(guildId)
    if (!connection || !queue || queue.length === 0) {
        return
    }
    const url = queue.shift()
    try {
        const stream = await ytstream.stream(url, {
            quality: 'low',
            type: 'audio',
            highWaterMark: 1048576 * 32
        })
        const resource = createAudioResource(stream.url)
        if (connection.state.subscription.player.state.status !== AudioPlayerStatus.Idle) {
            return
        }
        connection.state.subscription.player.play(resource)
    } catch (error) {
        console.error(error);
        playNext() // Reqursion should be safe as queue gets shifted every time
    }
}

// Adds a song to the queue and stats playing
const play = async (interaction, url) => {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      await interaction.editReply({ content: "Join a voice channel to play music!" });
      return;
    }
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) {
      await interaction.editReply({ content: "Oops, I don't have the permissions to join and play in your voice channel..." });
      return;
    }

    let connection = getVoiceConnection(interaction.guild.id)
    if (!connection) {
        allQueues.delete(interaction.guild.id)

        // Create the connection
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfMute: false,
        })

        connection.on("stateChange", (oldState, newState) => {
            console.log("state change:", oldState.status, newState.status);
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                const connection = getVoiceConnection(interaction.guild.id)
                if (connection) {
                    if (connection.state.subscription) {
                        console.log("stopped player")
                        connection.state.subscription.player.stop()
                    }
                }
                const queue = allQueues.get(interaction.guild.id)
                if (queue) {
                    console.log("deleted queue")
                    allQueues.delete(interaction.guild.id)
                }
            }
        })
    }

    if (!connection.state.subscription) {
        // Create the audio player
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        })
        player.on(AudioPlayerStatus.Playing, () => {
          console.log('Playing!');
        });
        player.on(AudioPlayerStatus.Buffering, () => {
          console.log('Buffering!');
        });
        player.on(AudioPlayerStatus.Idle, async () => {
            console.log('Idle!');
            playNext(interaction.guild.id)
        });
        player.on(AudioPlayerStatus.AutoPaused, () => {
          console.log('AutoPaused!');
        });
        player.on(AudioPlayerStatus.Paused, () => {
          console.log('Paused!');
        });

        // Subscribe the connection to the player
        connection.subscribe(player)
    }

    // Make sure the bot is in the voice channel
    connection.rejoin()

    // Add the new song to the queue
    let queue = allQueues.get(interaction.guild.id)
    if (!queue) {
        allQueues.set(interaction.guild.id, [])
        queue = allQueues.get(interaction.guild.id)
    }
    // TODO: validate url or get video by name
    queue.push(url)

    // Start playing if the player is idle
    if (connection.state.subscription.player.state.status === AudioPlayerStatus.Idle) {
        playNext(interaction.guild.id)
    }

    await interaction.editReply({ content: `Added ${url} to queue in ${voiceChannel.name}` });
}

const skip = async (interaction) => {
    const connection = getVoiceConnection(interaction.guild.id)
    if (!connection) {
        await interaction.editReply({ content: "The bot is not in any voice channel"})
        return
    }
    if (connection.state.subscription.player.state.status === AudioPlayerStatus.Idle) {
        await interaction.editReply({ content: "Nothing to skip"})
        return
    }
    connection.state.subscription.player.stop()
    await interaction.editReply({ content: "Skipped" }) // TODO: tell what was skipped
}

const pause = async (interaction) => {
    const connection = getVoiceConnection(interaction.guild.id)
    if (!connection) {
        await interaction.editReply({ content: "The bot is not in any voice channel"})
        return
    }
    connection.state.subscription.player.pause()
    await interaction.editReply({ content: "Paused"}) // TODO: tell what was paused
}

const resume = async (interaction) => {
    const connection = getVoiceConnection(interaction.guild.id)
    if (!connection) {
        await interaction.editReply({ content: "The bot is not in any voice channel"})
        return
    }
    connection.state.subscription.player.unpause()
    await interaction.editReply({ content: "Resuming"}) // TODO: tell what was resumed
}

const disconnect = async (interaction) => {
    const connection = getVoiceConnection(interaction.guild.id)
    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed && connection.state.status !== VoiceConnectionStatus.Disconnected) {
        if (connection.disconnect()) {
            await interaction.editReply({ content: "Disconnected" })
        } else {
            await interaction.editReply({ content: "There was an error disconnecting" })
        }
    } else {
        await interaction.editReply({ content: "Bot not in a voice chat" })
    }
}

const queue = async (interaction) => {
    const queue = allQueues.get(interaction.guild.id)
    if (!queue) {
        await interaction.editReply({ content: "The bot is currently not in a voice chat" })
        return
    }
    let response = ""
    for (const [i, value] of queue.entries()) {
        if (i === 5) {
            response += "\n..."
        }
        if (i < 5 || i > queue.length - 5) {
            response += `\n${i}: ${value}`
        }
    }
    await interaction.editReply({ content: response })
}

module.exports = { play, skip, pause, resume, disconnect, queue }
