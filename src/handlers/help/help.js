const { MessageEmbed } = require("discord.js")
const comandos = require('../../commands/comandos-struct')
const LIMITE_EMBEDS_DISCORD = 10

module.exports = message => {
  const embeds = comandos.map(cmd => {
    return new MessageEmbed()
      .setTitle(cmd.comando)
      .setDescription(cmd.descricao)
      .setColor("RANDOM")
  })

  if (embeds.length > LIMITE_EMBEDS_DISCORD) {
    let counter = 0
    let remapEmbeds = []
    embeds.forEach(embed => {
      counter++
      if (counter === LIMITE_EMBEDS_DISCORD) {
        message.author.send({ embeds: remapEmbeds })
        remapEmbeds = []
        counter = 0
      }

      remapEmbeds.push(embed)
    })

    if (remapEmbeds.length) {
      message.author.send({ embeds: remapEmbeds })
    }

    return
  }

  message.author.send({ embeds: embeds })
}
