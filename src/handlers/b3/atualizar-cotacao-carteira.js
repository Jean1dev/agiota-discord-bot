const axios = require('axios')
const puppeteer = require('puppeteer');
const fs = require('fs');

const baseUrl = 'https://carteira-14bc707a7fab.herokuapp.com/admin'
const yahooQuoteUrl = 'https://query1.finance.yahoo.com/v7/finance/quote'

const chromiumPaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
].filter(Boolean);

function getLaunchOptions() {
    const executablePath = chromiumPaths.find(p => p && fs.existsSync(p));
    return executablePath ? { headless: true, executablePath } : { headless: true };
}

function toYahooSymbol(papel) {
    const p = (papel || '').toUpperCase().trim();
    if (!p) return p;
    if (p.endsWith('.SA') || p.endsWith('.SA.SA')) return p.replace(/\.SA\.SA$/, '.SA');
    return p + '.SA';
}

const yahooHeaders = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://finance.yahoo.com/'
};

async function getLogoFromYahoo(papel) {
    const symbol = toYahooSymbol(papel);
    try {
        const { data } = await axios.get(yahooQuoteUrl, {
            params: { symbols: symbol, fields: 'companyLogoUrl,shortName' },
            timeout: 8000,
            headers: yahooHeaders
        });
        const result = data?.quoteResponse?.result?.[0];
        const url = result?.companyLogoUrl;
        if (url && url.startsWith('http')) {
            console.log('[Yahoo] Logo encontrada para', papel, '->', url);
            return url;
        }
        console.log('[Yahoo] Sem logo para', papel);
        return null;
    } catch (err) {
        console.log('[Yahoo] Erro ao buscar', papel, err.message);
        return null;
    }
}

async function getLogoFromYahooWithBrowser(page, papel) {
    const symbol = toYahooSymbol(papel);
    try {
        const url = `https://finance.yahoo.com/quote/${symbol}`;
        console.log('[Yahoo+Puppeteer] Abrindo', url);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));
        const logoUrl = await page.evaluate(() => {
            const imgs = document.querySelectorAll('img');
            for (const img of imgs) {
                const s = (img.src || '').toLowerCase();
                if (s && (s.includes('logo') || s.includes('yimg.com') || s.includes('media') || s.includes('brand')) && !s.includes('favicon')) {
                    return img.src;
                }
            }
            const firstDataImg = document.querySelector('img[data-src]');
            if (firstDataImg && firstDataImg.dataset.src) return firstDataImg.dataset.src;
            return null;
        });
        if (logoUrl) {
            console.log('[Yahoo+Puppeteer] Logo encontrada para', papel);
            return logoUrl;
        }
        return null;
    } catch (err) {
        console.log('[Yahoo+Puppeteer] Erro', err.message);
        return null;
    }
}

async function imgScrapeBing(page, query) {
    try {
        const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query + ' ação logo')}&first=1`;
        console.log('[Bing] Buscando imagens para:', query);
        await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 20000 });
        await page.waitForSelector('.iusc', { timeout: 10000 }).catch(() => null);
        await new Promise(r => setTimeout(r, 1500));

        const urls = await page.evaluate(() => {
            const out = [];
            document.querySelectorAll('.iusc').forEach(el => {
                try {
                    const m = el.getAttribute('m');
                    if (m) {
                        const obj = JSON.parse(m);
                        if (obj.murl && obj.murl.startsWith('http')) out.push(obj.murl);
                    }
                } catch (_) {}
            });
            return out.slice(0, 5);
        });
        console.log('[Bing] Encontradas', urls.length, 'imagens para', query);
        return urls.length ? urls : null;
    } catch (err) {
        console.log('[Bing] Erro', err.message);
        return null;
    }
}

async function imgScrapeGoogle(page, query) {
    try {
        console.log('[Google] Buscando imagens para:', query);
        await page.goto(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query + ' ação')}`, {
            waitUntil: 'networkidle2',
            timeout: 25000
        });
        await page.waitForSelector('img', { timeout: 10000 }).catch(() => null);
        await new Promise(r => setTimeout(r, 1500));

        const fromPage = await page.evaluate(() => {
            const urls = [];
            document.querySelectorAll('img').forEach(img => {
                const url = (img.src || img.dataset.src || img.getAttribute('data-src') || '').trim();
                if (!url || !url.startsWith('http')) return;
                urls.push(url);
            });
            return urls;
        });

        const external = fromPage.filter(u => !u.includes('gstatic.com') && !u.includes('google.com'));
        const thumbnails = fromPage.filter(u => u.includes('tbn0.gstatic.com') || u.includes('gstatic.com/images'));
        const images = external.length ? external : thumbnails;
        const result = images.slice(0, 3);
        console.log('[Google] Encontradas', result.length, 'imagens para', query);
        return result.length ? result : null;
    } catch (err) {
        console.log('[Google] Erro', err.message);
        return null;
    }
}

async function fetchImageWithBrowser(papel) {
    let browser;
    try {
        console.log('[Browser] Iniciando...');
        browser = await puppeteer.launch(getLaunchOptions());
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        let url = await getLogoFromYahooWithBrowser(page, papel);
        if (url) return url;

        const bingResults = await imgScrapeBing(page, papel);
        if (bingResults && bingResults[0]) return bingResults[0];

        const googleResults = await imgScrapeGoogle(page, papel);
        if (googleResults && googleResults[0]) return googleResults[0];

        return null;
    } catch (err) {
        console.error('[Browser] Erro:', err.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
            console.log('[Browser] Fechado.');
        }
    }
}

function deleteMessageAfterTime(message) {
    setTimeout(() => message.delete(), 10000)
}

module.exports = async message => {
    console.log('[atualizar-carteira] Comando iniciado.');
    message.reply('momentinho vou verificar').then(deleteMessageAfterTime)

    console.log('[atualizar-carteira] Disparando POST', baseUrl);
    await axios.default.post(`${baseUrl}`)

    const { data: listaAtivos } = await axios.default.get(`${baseUrl}/ativos-sem-image`)
    console.log('[atualizar-carteira] Ativos sem imagem:', listaAtivos.length, listaAtivos);
    if (listaAtivos.length == 0) {
        message.reply('nenhum ativo para monitorar').then(deleteMessageAfterTime)
        return
    }

    const ativoComImagem = []
    for (const papel of listaAtivos) {
        try {
            console.log('[atualizar-carteira] Processando papel:', papel);
            let imageUrl = await getLogoFromYahoo(papel);
            if (!imageUrl) {
                imageUrl = await fetchImageWithBrowser(papel);
            }
            if (!imageUrl) {
                console.log('[atualizar-carteira] Sem imagem para', papel);
                message.channel.send(`Nao consegui adicionar esse papel ${papel}`).then(deleteMessageAfterTime)
                continue
            }
            ativoComImagem.push({
                papel,
                imagem: imageUrl
            })
            console.log('[atualizar-carteira] Imagem obtida para', papel);
        } catch (e) {
            console.error('[atualizar-carteira] Erro ao processar', papel, e.message);
            message.channel.send(`Nao consegui adicionar esse papel ${papel}`).then(deleteMessageAfterTime)
        }
    }

    console.log('[atualizar-carteira] Atualizando', ativoComImagem.length, 'ativos na API...');
    for (const obj of ativoComImagem) {
        await axios.default.put(`${baseUrl}/atualizar-ativo`, {
            nome: obj.papel,
            imageUrl: obj.imagem
        })
        console.log('[atualizar-carteira] API atualizada:', obj.papel);
        message.channel.send(`Atualizado ${obj.papel}`).then(deleteMessageAfterTime)
    }
    console.log('[atualizar-carteira] Concluído.');
}