const { getInfo } = require('ytdl-core')
const { createAudioResource, demuxProbe } = require('@discordjs/voice')
const { exec } = require('youtube-dl-exec')

const noop = () => { };

class Track {
    constructor({ url, title, onStart, onFinish, onError }) {
        this.url = url;
        this.title = title;
        this.onStart = onStart;
        this.onFinish = onFinish;
        this.onError = onError;
    }

    createAudioResource() {
        return new Promise((resolve, reject) => {
            const process = exec(
                this.url,
                {
                    output: '-',
                    quiet: true,
                    format: 'best[ext=opus]/best',
                    //limitRate: '100K',
                },
                { stdio: ['ignore', 'pipe', 'ignore'] },
            );
            if (!process.stdout) {
                reject(new Error('No stdout'));
                return;
            }
            const stream = process.stdout;
            const onError = (error) => {
                if (!process.killed) process.kill();
                console.log(error)
                stream.resume();
                reject(error);
            };
            process
                .once('spawn', () => {
                    demuxProbe(stream)
                        .then((probe) => resolve(createAudioResource(probe.stream, { metadata: this, inputType: probe.type })))
                        .catch(onError);
                })
                .catch(onError);
        });
    }

    static async from(url, methods) {
        const info = await getInfo(url);

        const wrappedMethods = {
            onStart() {
                wrappedMethods.onStart = noop;
                methods.onStart();
            },
            onFinish() {
                wrappedMethods.onFinish = noop;
                methods.onFinish();
            },
            onError(error) {
                wrappedMethods.onError = noop;
                methods.onError(error);
            },
        };

        return new Track({
            title: info.videoDetails.title,
            url,
            ...wrappedMethods,
        });
    }
}

module.exports = Track