FROM node:24-slim
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile && pnpm --filter google-reviews-backend build
EXPOSE 8080
CMD ["pnpm", "--filter", "google-reviews-backend", "start"]
