const context = require('../../context').contextInstance

function umaDivida(valorDivida, descricao, quemEmprestouDinheiro) {
  return {
    data: new Date(),
    valor: valorDivida,
    descricao,
    quemEmprestouDinheiro
  }
}

module.exports = async (args, message) => {
  message.reply('blz, vou adicionar a divida')
  
  const valorDivida = args[0]
  const userId = args[1]
  const descricao = args.splice(2, args.length).join(' ')
  const quemEmprestouDinheiro = message.author.username
  const usuario = context().dividas.find(user => user.id === userId)

  if (usuario) {
    usuario.pendencias.push(umaDivida(valorDivida, descricao, quemEmprestouDinheiro))
    context().save()
    return
  }

  context().dividas.push({
    id: userId,
    pagamentos: [],
    pendencias: [umaDivida(valorDivida, descricao, quemEmprestouDinheiro)]
  })

  context().save()
}
