const { PermissionsBitField } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, VoiceConnectionStatus } = require('@discordjs/voice');
const playdl = require('play-dl')

// Map queues by guild
const allQueues = new Map()

const youtubeVideoString = (youtubeVideo, showUrl = false) => {
    const y = youtubeVideo
    return `**${y.title}** \`${y.durationRaw}\`${showUrl ? ` - ${y.url}` : ""}`
}

const playNext = async (guildId) => {
    const connection = getVoiceConnection(guildId)
    const queue = allQueues.get(guildId)
    if (!connection || !queue || queue.length === 0) {
        return
    }
    // Remove the first element (previous song)
    queue.shift()
    if (queue.length === 0) {
        return
    }
    const ytVideo = queue.at(0)
    console.log(ytVideo.url)
    try {
        const stream = await playdl.stream(ytVideo.url)
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type
        })
        createAudioPlayer().checkPlayable()
        if (connection.state.subscription.player.state.status !== AudioPlayerStatus.Idle) {
            return
        }
        connection.state.subscription.player.play(resource)
    } catch (error) {
        console.error(error);
        await playNext() // Recursion should be safe as queue gets shifted every time
    }
}

// Adds a song to the queue and stats playing
const play = async (interaction, search) => {
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
    if (!connection || connection.state.status === VoiceConnectionStatus.Disconnected || connection.state.status === VoiceConnectionStatus.Destroyed) {
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
        console.log("created connection")
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
            await playNext(interaction.guild.id)
        });
        player.on(AudioPlayerStatus.AutoPaused, () => {
          console.log('AutoPaused!');
        });
        player.on(AudioPlayerStatus.Paused, () => {
          console.log('Paused!');
        });

        // Subscribe the connection to the player
        connection.subscribe(player)
        console.log("created audio player")
    }

    // Make sure the bot is in the voice channel
    // connection.rejoin()

    // Add the new song to the queue
    let queue = allQueues.get(interaction.guild.id)
    if (!queue) {
        allQueues.set(interaction.guild.id, [])
        queue = allQueues.get(interaction.guild.id)
    }

    const searched = await playdl.search(search, { source: { youtube: "video" }, limit: 1,  })
    if (searched.length === 0) {
        await interaction.editReply({ content: `No results for ${search}` });
        return
    }
    queue.push(searched.at(0))
    // console.log(searched.at(0))

    // Start playing if the player is idle
    if (connection.state.subscription.player.state.status === AudioPlayerStatus.Idle) {
        queue.push(searched.at(0)) // Push an extra of the first song
        await playNext(interaction.guild.id)
    }

    await interaction.editReply({ content: `Added to queue in ${voiceChannel.name}:\n${youtubeVideoString(searched.at(0), true)}` });
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

    const queue = allQueues.get(interaction.guild.id)
    if (!queue || queue.length === 0) {
        await interaction.editReply({ content: "Nothing to skip anything"})
    } else {
        connection.state.subscription.player.stop()
        await interaction.editReply({ content: `Skipped ${youtubeVideoString(queue.at(0))}`})
    }
}

const pause = async (interaction) => {
    const connection = getVoiceConnection(interaction.guild.id)
    if (!connection) {
        await interaction.editReply({ content: "The bot is not in any voice channel"})
        return
    }

    const queue = allQueues.get(interaction.guild.id)
    if (!queue || queue.length === 0) {
        await interaction.editReply({ content: "Nothing to pause"})
    } else {
        connection.state.subscription.player.pause()
        await interaction.editReply({ content: `Paused ${youtubeVideoString(queue.at(0))}`})
    }
}

const resume = async (interaction) => {
    const connection = getVoiceConnection(interaction.guild.id)
    if (!connection) {
        await interaction.editReply({ content: "The bot is not in any voice channel"})
        return
    }

    const queue = allQueues.get(interaction.guild.id)
    if (!queue || queue.length === 0) {
        await interaction.editReply({ content: "Nothing to resume"})
    } else {
        connection.state.subscription.player.unpause()
        await interaction.editReply({ content: `Resuming ${youtubeVideoString(queue.at(0))}`})
    }
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
    if (!queue || queue.length === 0) {
        await interaction.editReply({ content: "Nothing in queue" })
        return
    }
    let response = ""
    for (const [i, value] of queue.entries()) {
        if (i === 5) {
            response += "\n..."
        }
        if (i < 5 || i > queue.length - 5) {
            response += `\n${i}: ${youtubeVideoString(value)}`
        }
    }
    await interaction.editReply({ content: response })
}

module.exports = { play, skip, pause, resume, disconnect, queue }
