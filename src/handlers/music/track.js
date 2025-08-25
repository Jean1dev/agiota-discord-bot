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
                    noWarnings: true,
                    noCallHome: true,
                    addHeader: [
                        'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ]
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
                .on('error', onError)
        });
    }

    static async from(url, methods) {
        let info;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                const ytInfo = await exec(url, {
                    dumpSingleJson: true,
                    noWarnings: true,
                    noCallHome: true,
                    preferFreeFormats: true,
                    addHeader: [
                        'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ]
                }, { stdio: ['ignore', 'pipe', 'ignore'] });
                
                const ytInfoStr = ytInfo.stdout.toString();
                const ytInfoData = JSON.parse(ytInfoStr);
                
                info = {
                    videoDetails: {
                        title: ytInfoData.title || 'Unknown Title'
                    }
                };
                break;
            } catch (error) {
                retryCount++;
                console.warn(`youtube-dl-exec attempt ${retryCount} failed:`, error.message);
                
                if (retryCount >= maxRetries) {
                    console.error('youtube-dl-exec failed after all retries:', error.message);
                    throw new Error('Failed to get video information. Please try again later.');
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }
        }

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