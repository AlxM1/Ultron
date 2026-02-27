FROM node:20-slim
RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*
RUN npx playwright install --with-deps chromium
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
EXPOSE 3500
CMD ["node", "server.js"]
