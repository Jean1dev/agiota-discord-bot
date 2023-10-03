const context = require('../../context');


const NumerosCores = {
  1: { 'cor': 'vermelho' },
  2: { 'cor': 'preto' },
  3: { 'cor': 'vermelho' },
  4: { 'cor': 'preto' },
  5: { 'cor': 'vermelho' },
  6: { 'cor': 'preto' },
  7: { 'cor': 'vermelho' },
  8: { 'cor': 'preto' },
  9: { 'cor': 'vermelho' },
  10: { 'cor': 'preto' },
  11: { 'cor': 'preto' },
  12: { 'cor': 'vermelho' },
  13: { 'cor': 'preto' },
  14: { 'cor': 'vermelho' },
  15: { 'cor': 'preto' },
  16: { 'cor': 'vermelho' },
  17: { 'cor': 'preto' },
  18: { 'cor': 'vermelho' },
  19: { 'cor': 'vermelho' },
  20: { 'cor': 'preto' },
  21: { 'cor': 'vermelho' },
  22: { 'cor': 'preto' },
  23: { 'cor': 'vermelho' },
  24: { 'cor': 'preto' },
  25: { 'cor': 'vermelho' },
  26: { 'cor': 'preto' },
  27: { 'cor': 'vermelho' },
  28: { 'cor': 'preto' },
  29: { 'cor': 'preto' },
  30: { 'cor': 'vermelho' },
  31: { 'cor': 'preto' },
  32: { 'cor': 'vermelho' },
  33: { 'cor': 'preto' },
  34: { 'cor': 'vermelho' },
  35: { 'cor': 'preto' },
  36: { 'cor': 'vermelho' }
};

module.exports = async menuInteraction => {

  if (menuInteraction.isSelectMenu()) {
    const authorMention = menuInteraction.user.username;
    const tipoAposta = menuInteraction.customId;
    const valoresAposta = menuInteraction.values;

    context.apostasRoulette[authorMention] = {
      ...context.apostasRoulette[authorMention],
      [tipoAposta]: valoresAposta
    };

    context.save();
    
    console.log(context.apostasRoulette)

    menuInteraction.reply({
      content: `Aposta em ${valoresAposta} realizada(s) com sucesso`,
      ephemeral: true
    }).then(() => {
      setTimeout(() => {
        menuInteraction.deleteReply();
      }, 5000);
    })
  }

}