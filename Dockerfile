FROM node:22-bookworm

RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip curl unzip && \
    pip3 install --break-system-packages yt-dlp && \
    curl -fsSL https://deno.land/install.sh | sh && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.deno/bin:${PATH}"

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
