const http = require('https'),
  Stream = require('stream').Transform,
  fs = require('fs')

function awaitImagingProces() {
  setTimeout(() => {
    const file = fs.readFileSync('C:/Users/jeanluca.fernandes/Documents/projetos/Reconhecimento-Facil-/tensorflow-grpc-java/output.txt')
    console.log('oi')
  }, 3000)
}

function downloadAndSave(url) {
  http.request(url, function (response) {
    const data = new Stream()

    response.on('data', function (chunk) {
      data.push(chunk)
    })

    response.on('end', function () {
      fs.writeFileSync('C:/Users/jeanluca.fernandes/Documents/projetos/Reconhecimento-Facil-/tensorflow-grpc-java/img.jpg', data.read())
      awaitImagingProces()
    })

  }).end()
}

module.exports = downloadAndSave
