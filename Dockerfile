# Dockerfile para Next.js con better-sqlite3
FROM node:20-alpine AS base

# Instalar dependencias necesarias para compilar better-sqlite3
RUN apk add --no-cache python3 make g++

# Dependencias
FROM base AS deps
WORKDIR /app

COPY package.json ./
RUN npm install --production=false

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deshabilitar telemetría de Next.js durante build
ENV NEXT_TELEMETRY_DISABLED=1

# Set production env for DB init
ENV NODE_ENV=production

# Ensure writable data directory exists
RUN mkdir -p /app/data

# Crear la base de datos para el build
RUN node scripts/setup-db.js

RUN npm run build

# Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Instalar dependencias de runtime necesarias para better-sqlite3
RUN apk add --no-cache libstdc++

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts

# Crear directorio para la base de datos y dar permisos
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Script de inicio que inicializa la DB y arranca el servidor
CMD ["sh", "-c", "node scripts/setup-db.js && node server.js"]
