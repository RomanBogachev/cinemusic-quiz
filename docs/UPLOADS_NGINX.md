# Проверка отдачи uploads через Nginx

На production-сервере uploads могут отдаваться напрямую через системный Nginx, а не через Next.js. Это быстрее и не зависит от runtime-сборки приложения.

Пример Nginx location:

```nginx
location ^~ /uploads/ {
    alias /var/lib/docker/volumes/cinemusic-quiz_cinemusic_uploads/_data/;
    add_header X-Uploads-Location "nginx-static" always;
    access_log off;
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
}
```

Если файлы есть в Docker volume, но Nginx отдаёт `403 Forbidden`, обычно nginx worker не может пройти по одному из родительских каталогов Docker volume или прочитать файлы в `_data`.

## Проверка

Запустите на сервере из директории проекта:

```bash
sudo ./scripts/check-upload-permissions.sh \
  --volume cinemusic-quiz_cinemusic_uploads \
  --domain https://quiz.indigo-cat.ru
```

Скрипт проверяет:

- наличие Docker volume;
- mountpoint volume;
- права на Docker root, `volumes`, directory конкретного volume и `_data`;
- количество файлов в `images`, `audio`, `video`, `covers`;
- sample URL вида `https://quiz.indigo-cat.ru/uploads/images/file.jpg`;
- header `X-Uploads-Location: nginx-static`;
- наличие nginx location/alias в `nginx -T`, если команда доступна;
- SELinux status, если доступен `getenforce`.

Можно проверить конкретный файл:

```bash
sudo ./scripts/check-upload-permissions.sh \
  --volume cinemusic-quiz_cinemusic_uploads \
  --domain https://quiz.indigo-cat.ru \
  --sample-file images/example.jpg
```

## Исправление прав

Для исправления используйте явный флаг `--fix`:

```bash
sudo ./scripts/check-upload-permissions.sh \
  --volume cinemusic-quiz_cinemusic_uploads \
  --domain https://quiz.indigo-cat.ru \
  --fix
```

Без `--yes` скрипт попросит ввести `FIX`.

В режиме `--fix` применяются только эти команды с реальным путём volume:

```bash
chmod o+x /var/lib/docker
chmod o+x /var/lib/docker/volumes
chmod o+x /var/lib/docker/volumes/cinemusic-quiz_cinemusic_uploads
chmod -R o+rX /var/lib/docker/volumes/cinemusic-quiz_cinemusic_uploads/_data
```

Скрипт не делает `chmod -R 777`, не меняет владельца файлов, не трогает PostgreSQL volume и не меняет другие Docker volumes.

## Ручная HTTP-проверка

```bash
curl -I https://quiz.indigo-cat.ru/uploads/images/<file>.jpg
```

Ожидаемо:

```text
HTTP/2 200
X-Uploads-Location: nginx-static
```

Диагностика:

- `200` и `X-Uploads-Location: nginx-static` — Nginx отдаёт файл напрямую.
- `403` — чаще всего права на volume path или SELinux.
- `404` — неверный alias, неверный путь файла или файл не там.
- `502` — `/uploads` не попал в static location и ушёл в proxy/app.
- Нет `X-Uploads-Location` — запрос не попал в нужный Nginx location.

## SELinux

Если `getenforce` возвращает `Enforcing`, обычного `chmod` может быть недостаточно. Скрипт не отключает SELinux и не меняет контекст автоматически.

Рекомендуемые команды:

```bash
dnf install -y policycoreutils-python-utils
semanage fcontext -a -t httpd_sys_content_t '/var/lib/docker/volumes/cinemusic-quiz_cinemusic_uploads/_data(/.*)?'
restorecon -Rv /var/lib/docker/volumes/cinemusic-quiz_cinemusic_uploads/_data
systemctl reload nginx
```

Не используйте `setenforce 0` как постоянное решение.

## После deploy или миграции

После миграции uploads или изменения Nginx полезно выполнить:

```bash
sudo ./scripts/check-upload-permissions.sh \
  --volume cinemusic-quiz_cinemusic_uploads \
  --domain https://quiz.indigo-cat.ru
```
