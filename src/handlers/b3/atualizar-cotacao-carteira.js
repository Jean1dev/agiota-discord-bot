const axios = require('axios')
const puppeteer = require('puppeteer')

const baseUrl = 'https://carteira-14bc707a7fab.herokuapp.com/admin'

async function imgScrape(queries) {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        var images;
        for (const query of queries) {
            await page.goto(`https://www.google.com/search?tbm=isch&q=${query}`);

            // Scroll to the bottom of the page to load more images
            await page.evaluate(async () => {
                for (let i = 0; i < 10; i++) {
                    window.scrollBy(0, window.innerHeight);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for more images to load
                }
            });

            // Wait for images to be loaded
            await page.waitForSelector('img');

            // Extract image URLs
            images = await page.evaluate(() => {
                const imageElements = document.querySelectorAll('img');
                const urls = [];
                imageElements.forEach(img => {
                    const url = img.src;
                    if (url.startsWith('http') && !url.includes('google')) {
                        urls.push(url);
                    }
                });
                return urls.slice(0, 3); // Limit to first 3 image URLs
            });
        }

        await browser.close();
        return images;

    } catch (err) {
        console.error('An error occurred:', err);
    }
}

function deleteMessageAfterTime(message) {
    setTimeout(() => message.delete(), 10000)
}

module.exports = async message => {
    message.reply('momentinho vou verificar').then(deleteMessageAfterTime)

    await axios.default.post(`${baseUrl}`)

    const { data: listaAtivos } = await axios.default.get(`${baseUrl}/ativos-sem-image`)
    if (listaAtivos.length == 0) {
        message.reply('nenhum ativo para monitorar').then(deleteMessageAfterTime)
        return
    }

    const ativoComImagem = []
    for (const papel of listaAtivos) {
        try {
            const results = await imgScrape([papel])
            ativoComImagem.push({
                papel,
                imagem: results[0]['url']
            })
        } catch (e) {
            console.log(e.message)
            message.channel.send(`Nao consegui adicionar esse papel ${papel}`).then(deleteMessageAfterTime)
        }
    }

    for (const obj of ativoComImagem) {
        await axios.default.put(`${baseUrl}/atualizar-ativo`, {
            nome: obj.papel,
            imageUrl: obj.imagem
        })
        message.channel.send(`Atualizado ${obj.papel}`).then(deleteMessageAfterTime)
    }

}