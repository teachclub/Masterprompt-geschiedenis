FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
# Cloud Run gebruikt PORT env, onze server luistert daarop (default 8080)
CMD ["node","server.mjs"]
