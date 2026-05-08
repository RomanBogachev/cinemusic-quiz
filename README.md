# Quiz for Friends

Self-hosted веб-платформа для домашних квизов с друзьями. Открываете сайт на ноутбуке или телевизоре, выбираете формат и тему, показываете медиа-вопросы, а ответ раскрываете вручную.

## Быстрый запуск

```bash
cp .env.example .env
docker compose up -d --build
```

После запуска сайт доступен на:

```text
http://localhost:3000
```

## Переменные окружения

```env
DATABASE_URL=file:/app/data/quiz.db
UPLOAD_DIR=/app/uploads
ADMIN_PASSWORD=change-me
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`ADMIN_PASSWORD` задает пароль для `/admin`.

## Админка

Откройте:

```text
http://localhost:3000/admin
```

Введите пароль из `ADMIN_PASSWORD`. После входа приложение сохранит httpOnly cookie.

## Как добавить карточку

1. Перейдите в `/admin/topics`.
2. Нажмите `Новая карточка`.
3. Выберите тип: фото, музыка или видео.
4. Укажите название, описание и при необходимости загрузите обложку.
5. Сохраните карточку.

## Как добавить фото-вопрос

1. Откройте нужную карточку в админке.
2. Нажмите `Добавить вопрос`.
3. Выберите тип медиа `Фото`.
4. Загрузите `jpg`, `jpeg`, `png`, `webp` или legacy `gif`.
5. Укажите правильный ответ и сохраните.

## Как добавить музыкальный вопрос

1. Создайте вопрос с типом медиа `Музыка`.
2. Загрузите `mp3`, `wav`, `m4a`, `aac`, `ogg`, `flac` или `opus`.
3. После сохранения откройте вопрос на редактирование и выберите фрагмент во встроенном waveform-редакторе.
4. Нажмите `Применить настройки`: приложение создаст готовые нарезки 1, 3, 5 и 10 секунд в той же папке uploads.
5. На странице квиза будут доступны кнопки проигрывания готовых фрагментов.

Пример: `audioStart = 42` даст фрагменты `42-43`, `42-45`, `42-47`, `42-52`.

## Как добавить видео-вопрос

1. Создайте вопрос с типом медиа `Видео`.
2. Загрузите `mp4`.
3. Укажите `videoStart` и `videoEnd` в секундах.
4. В режиме квиза кнопка `Играть фрагмент` запустит видео с `videoStart` и остановит на `videoEnd`.

## Где лежат файлы

В Docker файлы хранятся в volume `quiz_uploads`:

```text
/app/uploads/images
/app/uploads/audio
/app/uploads/video
/app/uploads/covers
```

SQLite база хранится в volume `quiz_db`:

```text
/app/data/quiz.db
```

Файлы доступны приложению по URL вида:

```text
/uploads/audio/example.mp3
```

## Backup

Сделать архив базы и uploads:

```bash
docker compose exec quiz sh -c 'tar -czf /tmp/quiz-backup.tar.gz /app/data /app/uploads'
docker cp quiz-for-friends:/tmp/quiz-backup.tar.gz ./quiz-backup.tar.gz
```

Восстановление обычно делается обратным копированием архива в контейнер или через временный контейнер с подключенными volumes.

## Prisma

В контейнере при старте выполняется:

```bash
prisma migrate deploy
prisma db seed
```

Seed создает три фиксированных типа категорий и несколько пустых тематических карточек без реальных медиафайлов.

## API

Доступны endpoint'ы:

- `GET /api/categories`
- `GET /api/topics`
- `POST /api/topics`
- `GET /api/topics/:id`
- `PATCH /api/topics/:id`
- `DELETE /api/topics/:id`
- `GET /api/questions?topicId=...`
- `POST /api/questions`
- `PATCH /api/questions/:id`
- `DELETE /api/questions/:id`
- `POST /api/upload`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`

Админские `POST`, `PATCH`, `DELETE` и upload требуют активной admin session.
