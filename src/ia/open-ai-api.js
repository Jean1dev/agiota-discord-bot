const OpenAI = require('openai');
const { KEY_OPEN_AI } = require('../config');

const client = new OpenAI({
    apiKey: KEY_OPEN_AI
});

async function audioCompletion(inputText) {
    const mp3 = await client.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: inputText,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return buffer
}

async function textCompletion(messages) {
    try {
        const chatCompletion = await client.chat.completions.create({
            messages,
            model: 'gpt-3.5-turbo',
            temperature: 0.8
        });

        return chatCompletion;
    } catch (error) {
        if (err instanceof OpenAI.APIError) {
            console.log(err.status); 
            console.log(err.name);
            console.log(err.headers);
        }
        throw err;
    }
}

module.exports = {
    textCompletion,
    audioCompletion
}




