FROM node:22-bookworm

RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip curl git && \
    pip3 install --break-system-packages yt-dlp bgutil-ytdlp-pot-provider && \
    curl -fsSL https://deno.land/install.sh | sh && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.deno/bin:${PATH}"

WORKDIR /app

# Install bgutil POT server
RUN git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil

WORKDIR /opt/bgutil/server

RUN npm ci && \
    npx tsc

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "node /opt/bgutil/server/build/main.js & npm start"]