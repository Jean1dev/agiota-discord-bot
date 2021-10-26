const comandos = []

function registrarComando(comando, handler, descricao, needArgs = false) {
  comandos.push({
    comando,
    handler,
    descricao,
    needArgs
  })
}

module.exports = {
  comandos,
  registrarComando
}
