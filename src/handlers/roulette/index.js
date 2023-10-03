const { MessageEmbed } = require("discord.js");
const {roletaOptions} = require("./apostas");
const context = require('../../context');
const gifApostaEncerrada = 'https://github-production-user-asset-6210df.s3.amazonaws.com/32443720/271431137-aeacd2a5-a3f1-49d0-a8c4-1989f57faefc.gif'

const multiplicador_de_milisegundos = 1000;


module.exports = async message => {
    if(context.apostasRouletteAbertas){
        context.apostasRouletteAbertas = !context.apostasRouletteAbertas;
        message.reply(`Apostas na rouletinha Encerradas`)
        context.save();
        return;
    }

    context.apostasRouletteAbertas = true;
    context.save();

    message.reply(`Apostas na rouletinha: Abertas`)

    setInterval(() => {game(message)}, 60 * multiplicador_de_milisegundos)
}

function game(message){
    message.channel.send('🎰 Junte-se à diversão da Roleta e teste a sua sorte! 🍀');
    
    message.channel.send({content: "Seleciones sua(s) aposta(s)!", components: roletaOptions})
    .then(msg => {
        setTimeout(() => msg.delete(), 30 * multiplicador_de_milisegundos)
    });
    
    setTimeout(()=>{
        const embed = new MessageEmbed()
            .setTitle('Apostas encerrada')
            .setImage(gifApostaEncerrada);

        message.channel.send({ embeds: [embed] })
        .then(msg => {
            setTimeout(() => msg.delete(), 5 * multiplicador_de_milisegundos)
        })
    }, 32 * multiplicador_de_milisegundos)

    setTimeout(()=>{
        const embed = new MessageEmbed()
            .setDescription('Aguarde os resultados')
            .setImage('https://j.gifs.com/y0drRB.gif');

        message.channel.send({ embeds: [embed] })
        .then(msg => {
            setTimeout(() => msg.delete(), 5 * multiplicador_de_milisegundos)
        })
    }, 37 * multiplicador_de_milisegundos)

    setTimeout(()=>{
        message.channel.send(`E a bolinha do meu saco caiu na casa: ${Math.floor(Math.random() * 37)}`)
        .then(msg => {
            setTimeout(() => msg.delete(), 10 * multiplicador_de_milisegundos)
        })
    }, 43 * multiplicador_de_milisegundos)
}