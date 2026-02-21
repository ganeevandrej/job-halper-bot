# --- ЭТАП 1: Сборка (Builder) ---
# Используем стабильную версию Node.js
FROM node:20-slim AS builder

# Активируем pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Создаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json для установки зависимостей
COPY package.json pnpm-lock.yaml ./

# Устанавливаем зависимости (только для продакшена)
RUN pnpm install --frozen-lockfile

# Копируем весь исходный код
COPY . .

# Запускаем сборку приложения
RUN pnpm build

# --- ЭТАП 2: Финальный образ (Runner) ---
FROM node:20-slim

# Активируем pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 1. Копируем только скомпилированный код из первого этапа
COPY --from=builder /app/dist ./dist

# 2. Копируем манифесты, чтобы поставить чистые зависимости
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

# 3. Устанавливаем только рабочие библиотеки (без devDependencies)
RUN pnpm install --prod --frozen-lockfile && pnpm cache clean --force

# Указываем переменную окружения по умолчанию (можно переопределить в docker-compose)
ENV NODE_ENV=production

# Запускаем скомпилированный файл (убедись, что путь до server.js верный)
CMD ["node", "dist/server.js"]