# Запуск cinemusic-quiz на сервере через Docker

Эта инструкция описывает базовый production/server-запуск без Nginx внутри Docker. Предполагается, что внешний системный Nginx на сервере проксирует запросы на приложение через `proxy_pass http://127.0.0.1:<APP_PORT>`.

## Требования

На сервере нужны:

- Docker
- Docker Compose plugin
- внешний Nginx, если проект нужно открыть в интернете

## 1. Клонировать проект

```bash
git clone https://github.com/RomanBogachev/cinemusic-quiz.git
cd cinemusic-quiz
```

## 2. Создать `.env`

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

`DATABASE_URL` для Docker вручную задавать не нужно: `docker-compose.yml` собирает его сам и использует внутренний host `postgres`.

## 3. Запустить контейнеры

```bash
docker compose up -d --build
```

При старте приложение выполняет:

```bash
npx prisma migrate deploy
npm run admin:init
npm run start
```

Production startup не запускает `prisma db seed`, `prisma migrate reset`, `prisma db push --force-reset` и не создаёт дефолтные темы.

## 4. Проверить состояние

```bash
docker compose ps
docker compose logs -f app
```

В `docker compose ps` порт приложения должен быть опубликован только на loopback:

```text
127.0.0.1:3000->3000/tcp
```

PostgreSQL не публикуется на host port и доступен только внутри Docker network по имени `postgres`.

## 5. Открыть локально на сервере

```bash
curl http://127.0.0.1:3000
```

## 6. Настроить внешний Nginx

Пример находится в:

```text
deploy/nginx/cinemusic-quiz.conf.example
```

Минимальный server block:

```nginx
server {
    server_name quiz.example.com;

    client_max_body_size 1024m;

    location / {
        proxy_pass http://127.0.0.1:3000;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Если `APP_PORT` не `3000`, замените порт в `proxy_pass`.

HTTPS и Certbot настраиваются на уровне host Nginx, не в этом Docker Compose.

## 7. Войти в админку

```text
https://quiz.example.com/admin/login
```

Первый администратор создаётся из:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL` (необязательно)
- `ADMIN_NAME` (необязательно)

Если администратор уже существует, `npm run admin:init` ничего не перезаписывает. Пароль хранится только как bcrypt hash.

Если `ADMIN_USERNAME` или `ADMIN_PASSWORD` не заданы, а администраторов ещё нет, первый пользователь может быть создан через UI на `/admin/login`.

## 8. Остановить

```bash
docker compose down
```

## 9. Обновить проект

```bash
git pull
docker compose up -d --build
```

## 10. Backup PostgreSQL

```bash
docker compose exec -T postgres pg_dump -U cinemusic cinemusic_quiz > backup.sql
```

Если вы поменяли `POSTGRES_USER` или `POSTGRES_DB`, используйте свои значения.

## 11. Restore PostgreSQL

```bash
cat backup.sql | docker compose exec -T postgres psql -U cinemusic -d cinemusic_quiz
```

## 12. Backup uploads

Имя volume зависит от имени compose-проекта. По умолчанию для директории проекта `cinemusic-quiz` это будет похоже на `cinemusic-quiz_cinemusic_uploads`.

Проверьте имя:

```bash
docker volume ls | grep cinemusic_uploads
```

Сделать архив:

```bash
docker run --rm \
  -v cinemusic-quiz_cinemusic_uploads:/data:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

## 13. Важное предупреждение

Не выполняйте:

```bash
docker compose down -v
```

Эта команда удалит volumes PostgreSQL и uploads.

## Полезные команды

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
