const { pipeline } = require('node:stream')
const { createWriteStream } = require('node:fs')
const { EndBehaviorType } = require('@discordjs/voice')
const prism = require('prism-media')
const path = require('path')

function getDisplayName(userId, user) {
	return user ? `${user.username}_${user.discriminator}` : userId
}

function ListeningStream(connectionReceiver, userId, user, callback = () => { }) {
	const opusStream = connectionReceiver.subscribe(userId, {
		end: {
			behavior: EndBehaviorType.AfterSilence,
			duration: 100,
		},
	})

	const oggStream = new prism.opus.OggLogicalBitstream({
		opusHead: new prism.opus.OpusHead({
			channelCount: 2,
			sampleRate: 48000,
		}),
		pageSizeControl: {
			maxPackets: 10,
		},
	})

	const filename = path.resolve(__dirname, `audio-${Date.now()}-${getDisplayName(userId, user)}.ogg`)

	const out = createWriteStream(filename)

	console.log(`👂 Started recording ${filename}`)

	pipeline(opusStream, oggStream, out, (err) => {
		if (err) {
			console.warn(`❌ Error recording file ${filename} - ${err.message}`)
		} else {
			console.log(`✅ Recorded ${filename}`)
			callback(filename)
		}
	})
}

module.exports = ListeningStream