const axios = require('axios');
const context = require('../../context')
const { KEY_OPEN_AI } = require('../../config')

module.exports = async (args, message) => {
    if (context.isChatGPTEnabled) {
        let userMessage = args.join(" ")
        const openaiAxios = axios.create({
            baseURL: 'https://api.openai.com/v1',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${KEY_OPEN_AI}`
            }
        });

        async function getCompletion() {
            try {
                const response = await openaiAxios.post('/chat/completions', {
                    model: 'gpt-3.5-turbo',
                    messages: [{
                        role: 'user',
                        content: userMessage
                    }],
                    temperature: 0.7
                });

                return response.data;
            } catch (error) {
                if (error.response) {
                    // Erros retornados pela API
                    console.error('Erro da API:', error.response.data);
                } else if (error.request) {
                    // A solicitação foi feita, mas não houve resposta
                    console.error('Nenhuma resposta da API:', error.request);
                } else {
                    // Algum erro ocorreu ao configurar a solicitação
                    console.error('Erro ao configurar a solicitação:', error.message);
                }
                throw error;
            }
        }
        getCompletion()
            .then(data => {
                const chatGPTResponse = data.choices[0].message.content.trim();
                message.reply(chatGPTResponse);
            })
            .catch(error => {
                message.reply('Error ao buscar resposta 🥵')
                console.error('Erro ao obter conclusão:', error);
            });
    } else {
        message.reply('Chat Gpt desativado  👩‍💻 🥵')
    }
}