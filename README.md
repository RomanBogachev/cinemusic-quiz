# cinemusic-quiz

Self-hosted платформа для домашних кино- и музыкальных квизов. Проект запускается в Docker: Next.js-приложение, PostgreSQL и persistent volume для загруженных медиа.

Подробная server-инструкция: [docs/DEPLOY_DOCKER.md](docs/DEPLOY_DOCKER.md).

## Быстрый запуск в Docker

### Требования

На сервере нужен только:

- Docker
- Docker Compose plugin
- внешний Nginx, если нужно публиковать проект в интернет

Nginx и HTTPS не поднимаются внутри Docker в этом проекте.

### 1. Клонировать проект

```bash
git clone https://github.com/RomanBogachev/cinemusic-quiz.git
cd cinemusic-quiz
```

### 2. Создать `.env`

```bash
cp .env.example .env
nano .env
```

Обязательно поменяйте:

- `POSTGRES_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_APP_URL`

Сгенерировать `ADMIN_SESSION_SECRET`:

```bash
openssl rand -base64 48
```

`DATABASE_URL` для Docker не нужно добавлять в `.env`: `docker-compose.yml` собирает его сам и использует внутренний host `postgres`.

### 3. Запустить контейнеры

```bash
docker compose up -d --build
```

### 4. Проверить состояние

```bash
docker compose ps
docker compose logs -f app
```

Приложение публикуется только на loopback:

```text
127.0.0.1:${APP_PORT:-3000}->3000/tcp
```

PostgreSQL не публикуется наружу и доступен только внутри Docker network.

### 5. Открыть локально

```bash
curl http://127.0.0.1:3000
```

В браузере:

```text
http://localhost:3000
```

### 6. Настроить внешний Nginx

Пример конфига:

```text
deploy/nginx/cinemusic-quiz.conf.example
```

Nginx на host-сервере должен проксировать на:

```text
http://127.0.0.1:${APP_PORT}
```

Если `APP_PORT=3000`:

```nginx
proxy_pass http://127.0.0.1:3000;
```

HTTPS/Certbot настраиваются на уровне внешнего Nginx.

### 7. Войти в админку

```text
https://quiz.example.com/admin/login
```

Для локального запуска:

```text
http://localhost:3000/admin/login
```

Первый администратор создаётся из:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL` (необязательно)
- `ADMIN_NAME` (необязательно)

Если администратор уже существует, `npm run admin:init` ничего не перезаписывает. Пароль хранится только как bcrypt hash.

### 8. Остановить

```bash
docker compose down
```

Не выполняйте `docker compose down -v`, если не хотите удалить базу и uploads.

## Что запускается в контейнере приложения

```bash
npx prisma migrate deploy
npm run admin:init
npm run start
```

Production startup не запускает:

- `prisma db seed`;
- `prisma migrate reset`;
- `prisma db push --force-reset`;
- seed-скрипты с дефолтными темами.

## Данные и volumes

PostgreSQL:

```text
cinemusic_postgres_data -> /var/lib/postgresql/data
```

Uploads:

```text
cinemusic_uploads -> /app/uploads
```

Структура uploads:

```text
/app/uploads/images
/app/uploads/audio
/app/uploads/video
/app/uploads/covers
```

После `docker compose restart app` и `docker compose down && docker compose up -d` данные сохраняются.

## Backup PostgreSQL

```bash
docker compose exec -T postgres pg_dump -U cinemusic cinemusic_quiz > backup.sql
```

## Restore PostgreSQL

```bash
cat backup.sql | docker compose exec -T postgres psql -U cinemusic -d cinemusic_quiz
```

## Проверка проекта

```bash
npm run lint
npx tsc --noEmit
npm run build
npx prisma validate
```
