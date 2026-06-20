# Безопасность, биллинг и эксплуатация

## Безопасность

HTTPS, Argon2id, HttpOnly cookie, CSRF, rate limit, request ID и лимиты размера запросов. Файлы проверяются по MIME, сигнатуре, размеру, checksum и расширению. Browser получает только presigned URL, а не ключ S3. Токены AI, соцсетей и оплат шифруются и не попадают в логи. Нужны CSP, security headers и защита от SSRF для webhook и внешних URL.

Проверка доступа должна быть в service layer, а не только в route. Тестировать чужие workspace ID, background jobs, экспорт, медиа, биллинг и callbacks.

## Entitlements

Примеры ключей: максимум проектов, рубрик, автоматических подключений, AI-генераций, секунд распознавания, объёма хранилища, планируемых публикаций, мест команды и доступ к Instagram publish. Resolver объединяет тариф, промо, ручные grants и usage. Ошибка лимита возвращает структурированное предложение обновить тариф.

## Mock billing

Free, Start, Pro, Business создаются как редактируемые seed-записи без окончательных коммерческих цифр. MockPaymentProvider имитирует pending и административное подтверждение только вне production. До живого провайдера интерфейс честно показывает недоступность оплаты.

## Наблюдаемость

JSON-логи с request/job/publication ID; метрики API, очередей, AI, fallback, публикаций, webhook и хранения; liveness/readiness; error tracking без секретов; аудит для владельца.

## Резервные копии и среды

Автоматический зашифрованный backup PostgreSQL вне сервера, проверка восстановления, lifecycle S3. Отдельные local, staging и production. CI никогда не публикует в настоящий канал.

## Миграции и ресурсы

Только Alembic, никакого `create_all` на production. Для рискованных изменений expand/migrate/contract. Пресеты идемпотентны. На первом VPS не запускать локальные LLM и тяжёлое перекодирование. Разделить очереди `default`, `ai`, `media`, `publication`, `webhook` и ограничить concurrency по провайдерам.
