const { MessageEmbed } = require("discord.js")

module.exports = message => {
  let embed = new MessageEmbed()
    .setTitle("Command List")
    .setDescription("!help, !roll, !kick, !ban")
    .setColor("RANDOM")

    message.channel.send({ embeds: [embed] })
}
