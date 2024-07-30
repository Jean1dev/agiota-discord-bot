const JEANLUCAFP_NICK = 'jeanlucafp'

module.exports = {
    JEANLUCAFP_NICK,
    formatDate: (data) => {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
      
        return `${dia}/${mes}/${ano}`;
    }
}