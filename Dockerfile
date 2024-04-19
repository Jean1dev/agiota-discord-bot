FROM node:21

# Instalar o yt-dlp usando o Python no contêiner
RUN apt-get update && apt-get install -y python3 && \
    curl -L https://yt-dl.org/downloads/latest/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json .env ./

RUN npm install

COPY . .

CMD ["npm", "start"] 
