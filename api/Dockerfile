FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run api:build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/api/dist ./api/dist
COPY api/schema.sql ./api/schema.sql

EXPOSE 3000

CMD ["node", "api/dist/api/src/server.js"]
