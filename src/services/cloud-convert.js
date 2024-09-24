const CloudConvert = require('cloudconvert');
const { CLOUD_CONVERT_API } = require('../config');
const axios = require('axios');
const fs = require('fs');

const cloudConvert = new CloudConvert(CLOUD_CONVERT_API);

async function downloadMP3(url, filePath) {
    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });

    } catch (error) {
        console.error(`Erro ao baixar o arquivo: ${error.message}`);
        throw error
    }
}

async function convertOggToMp3(oggFile) {
    let job = await cloudConvert.jobs.create({
        "tasks": {
            "upload-my-file": {
                "operation": "import/upload",
            },
            "convert-my-file": {
                "operation": "convert",
                "input": "upload-my-file",
                "output_format": "mp3"
            },
            "export-my-file": {
                "operation": "export/url",
                "input": "convert-my-file"
            }
        }
    });

    console.log(`cloud convert job created ${job.id} - ${job.status}`);
    const uploadTask = job.tasks.filter(task => task.name === 'upload-my-file')[0];
    const inputFile = fs.createReadStream(oggFile);

    await cloudConvert.tasks.upload(uploadTask, inputFile, 'result.mp3');

    job = await cloudConvert.jobs.wait(job.id);

    console.log(`cloud convert job ${job.id} - ${job.status}`);

    const file = cloudConvert.jobs.getExportUrls(job)[0];

    const resultPath = await downloadMP3(file.url, 'result.mp3');
    return resultPath
}

module.exports = {
    convertOggToMp3
}