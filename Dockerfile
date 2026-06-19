FROM node:23

# Python é dependência de runtime do yt-dlp
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json .env ./

RUN npm install

# O app usa o binário yt-dlp empacotado pelo youtube-dl-exec, que costuma
# estar desatualizado. O YouTube muda assinatura/anti-bot com frequência, então
# baixamos a release mais recente do yt-dlp sobre o binário bundled no build.
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o node_modules/youtube-dl-exec/bin/yt-dlp && \
    chmod a+rx node_modules/youtube-dl-exec/bin/yt-dlp

COPY . .

RUN npm run build

CMD ["npm", "start"]
