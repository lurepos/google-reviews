FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

COPY package.json ./
COPY node_modules ./node_modules
COPY dist ./dist

EXPOSE 8080

CMD ["node", "dist/main.js"]
