module.exports = async message => {
  const links_aleatorios = Array.from({ length: 5 }, (_, i) => `https://picsum.photos/seed/${Date.now()}${i}/600/400`);

  links_aleatorios.forEach((link, index) => {
    setTimeout(() => message.channel.send(link), index * 1000)
  })
}
