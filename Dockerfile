FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates ffmpeg && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates ffmpeg && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates ffmpeg && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/data /app/uploads/images /app/uploads/audio /app/uploads/video /app/uploads/covers
EXPOSE 3000

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node prisma/seed.js && node server.js"]
