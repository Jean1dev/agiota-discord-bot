const axios = require('axios');
const randomstring = require('randomstring');

module.exports = async message => {
  const gerar_link_aleatorio = () => {
    const letras = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let link_aleatorio = 'https://i.imgur.com/';
    for (let _ = 0; _ < 5; _++) {
      link_aleatorio += randomstring.generate({
        length: 1,
        charset: letras,
      });
    }
    link_aleatorio += '.jpg';
    return link_aleatorio;
  };

  const validar_link = async (link) => {
    try {
      const response = await axios.get(link);
      if (response.request.res.responseUrl !== "https://i.imgur.com/removed.png") {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const links_aleatorios = [];
  while (links_aleatorios.length < 5) {
    const link = gerar_link_aleatorio();
    const isValid = await validar_link(link);
    if (isValid) {
      links_aleatorios.push(link);
    }
  }
  message.reply(links_aleatorios.join(" "));
}
