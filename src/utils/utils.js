function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function nowInSaoPaulo() {
    const date = new Date();
    const utcOffset = -3; // UTC-3 for São Paulo
    const saoPauloDate = new Date(date.getTime() + utcOffset * 60 * 60 * 1000);
    return saoPauloDate;
}

module.exports = {
    sleep,
    nowInSaoPaulo
};