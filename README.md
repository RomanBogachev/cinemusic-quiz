# Cinemusic Quiz

Self-hosted платформа для домашних кино- и музыкальных квизов. Проект рассчитан на запуск на сервере через Docker: приложение Next.js, PostgreSQL, persistent volume для базы и отдельный volume для загруженных медиа.

## Запуск в Docker

### Требования

- Docker
- Docker Compose plugin (`docker compose`)

### 1. Клонировать проект

```bash
git clone https://github.com/RomanBogachev/cinemusic-quiz.git
cd cinemusic-quiz
```

### 2. Создать `.env`

```bash
cp .env.example .env
```

Отредактируйте `.env`:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `ADMIN_SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_APP_URL`, если приложение открывается не на `http://localhost:3000`

Сгенерировать session secret:

```bash
openssl rand -base64 48
```

Для Docker `DATABASE_URL` должен использовать host `postgres`, например:

```env
DATABASE_URL=postgresql://cinemusic:cinemusic_password@postgres:5432/cinemusic_quiz?schema=public
```

### 3. Запустить

```bash
docker compose up -d --build
```

При старте контейнер приложения безопасно выполняет:

```bash
npx prisma migrate deploy
npm run admin:init
npm run start
```

Destructive-команды вроде `prisma migrate reset`, `db push --force-reset` и seed с дефолтными темами при старте не запускаются.

### 4. Проверить статус и логи

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f postgres
```

### 5. Открыть приложение

```text
http://localhost:3000
```

Публичный просмотр квизов доступен только после входа администратора.

### 6. Войти в админку

```text
http://localhost:3000/admin/login
```

Первый администратор создаётся одним из двух способов:

1. Через UI: если в базе нет администраторов, `/admin/login` покажет форму создания первого пользователя.
2. Через Docker startup: если в `.env` заданы `ADMIN_EMAIL` и `ADMIN_PASSWORD`, команда `npm run admin:init` создаст первого администратора. Скрипт idempotent: если администратор уже существует, он ничего не перезаписывает.

Пароль хранится только как bcrypt hash.

### 7. Остановить

```bash
docker compose down
```

Не используйте `docker compose down -v`, если не хотите удалить PostgreSQL volume и uploads.

### 8. Обновить проект

```bash
git pull
docker compose up -d --build
```

### 9. Backup базы

```bash
docker compose exec -T postgres pg_dump -U cinemusic cinemusic_quiz > backup.sql
```

Если вы поменяли `POSTGRES_USER` или `POSTGRES_DB`, используйте свои значения.

### 10. Восстановление базы

```bash
cat backup.sql | docker compose exec -T postgres psql -U cinemusic -d cinemusic_quiz
```

### 11. Полезные команды

```bash
# Статус контейнеров
docker compose ps

# Логи приложения
docker compose logs -f app

# Логи PostgreSQL
docker compose logs -f postgres

# Перезапуск приложения
docker compose restart app

# Применить миграции вручную
docker compose exec app npx prisma migrate deploy

# Prisma validate
docker compose exec app npx prisma validate

# Зайти в контейнер приложения
docker compose exec app sh

# Зайти в psql
docker compose exec postgres psql -U cinemusic -d cinemusic_quiz
```

## Переменные окружения

Минимальная конфигурация находится в `.env.example`.

Обязательные для production:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`

Опциональные для первичной инициализации администратора:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

Пример:

```env
NODE_ENV=production
APP_PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

POSTGRES_USER=cinemusic
POSTGRES_PASSWORD=cinemusic_password
POSTGRES_DB=cinemusic_quiz
DATABASE_URL=postgresql://cinemusic:cinemusic_password@postgres:5432/cinemusic_quiz?schema=public

ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-admin-password
ADMIN_NAME=Admin
```

Не коммитьте реальный `.env`.

## Где хранятся данные

PostgreSQL:

```text
cinemusic_postgres_data -> /var/lib/postgresql/data
```

Uploads:

```text
quiz_uploads -> /app/uploads
```

Структура uploads:

```text
/app/uploads/images
/app/uploads/audio
/app/uploads/video
/app/uploads/covers
```

После `docker compose restart app` и `docker compose down && docker compose up -d` данные сохраняются. Данные удаляются только при удалении volumes, например через `docker compose down -v`.

## Админка

Откройте:

```text
http://localhost:3000/admin/login
```

В админке можно:

- создавать и редактировать темы;
- добавлять фото-, видео- и аудио-вопросы;
- загружать медиафайлы;
- управлять администраторами и менять пароли.

## Prisma

Схема использует PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Проверка:

```bash
npx prisma validate
```

Применить миграции:

```bash
npx prisma migrate deploy
```

Seed не запускается при Docker startup. Дефолтные темы не создаются автоматически.

## Проверка проекта локально

```bash
npm run lint
npx tsc --noEmit
npm run build
npx prisma validate
```
