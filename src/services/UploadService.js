const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

async function upload(filePath) {
    const storageServiceUrl = 'https://storage-manager-svc.herokuapp.com/v1/s3'
    const BUCKET_STORAGE = 'binnoroteirizacao'

    const fileContent = fs.createReadStream(filePath)
    const form = new FormData()
    form.append('file', fileContent)

    const options = {
        method: 'POST',
        url: storageServiceUrl,
        maxBodyLength: Infinity,
        params: { bucket: BUCKET_STORAGE },
        headers: {
            'Content-Type': 'multipart/form-data',
            'content-type': 'multipart/form-data; boundary=---011000010111000001101001'
        },
        data: form,
        timeout: 100000
    };

    try {
        const response = await axios.request(options)
        console.log('upload feito', response.data)

        return response.data
    } catch (error) {
        console.log(error)
        return null
    }
}

module.exports = upload