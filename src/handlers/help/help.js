const { MessageEmbed } = require("discord.js")
const { comandos } = require('../../commands/lista-comandos')

module.exports = message => {
  const embeds = comandos.map(cmd => {
    return new MessageEmbed()
      .setTitle(cmd.comando)
      .setDescription(cmd.descricao)
      .setColor("RANDOM")
  })
  message.channel.send({ embeds: embeds })
}
