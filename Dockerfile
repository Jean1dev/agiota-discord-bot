# Use a imagem oficial do Node.js como base
FROM node:18

# Instalar o yt-dlp usando o Python no contêiner
RUN apt-get update && apt-get install -y python3 && \
    curl -L https://yt-dl.org/downloads/latest/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Diretório de trabalho do aplicativo dentro do contêiner
WORKDIR /app

# Copiar os arquivos do aplicativo (package.json e package-lock.json) para o diretório de trabalho
COPY package*.json .env ./

# Instalar as dependências do aplicativo
RUN npm install

# Copiar o código do aplicativo para o diretório de trabalho
COPY . .

# Comando para executar o aplicativo
CMD ["npm", "start"] # Substitua "app.js" pelo nome do seu arquivo Node.js que contém o código fornecido anteriormente
