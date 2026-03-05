# WB Tariffs Collector

Сервис для сбора тарифов Wildberries (короба) и выгрузки актуальных данных в Google Таблицы.

**Что делает:**
- Каждый час запрашивает тарифы коробов с WB API и сохраняет их в PostgreSQL
- Данные накапливаются по дням; повторные запросы в течение дня обновляют запись за этот день
- После каждого сбора обновляет лист `stocks_coefs` во всех подключённых Google Таблицах
- Данные в таблицах отсортированы по коэффициенту доставки (возрастание)

---

## Предварительные требования

- [Docker](https://docs.docker.com/get-docker/) и [Docker Compose](https://docs.docker.com/compose/install/) v2+
- WB API-токен
- Google-аккаунт с сервисным аккаунтом и доступом к Google Sheets API

---

## Шаг 1 — Настроить Google Sheets

### 1.1 Создать сервисный аккаунт

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services → Library** и включите **Google Sheets API**
4. Перейдите в **APIs & Services → Credentials**
5. Нажмите **Create Credentials → Service account**, заполните имя
6. На странице сервисного аккаунта перейдите на вкладку **Keys → Add Key → Create new key → JSON**
7. Сохраните скачанный файл как `google-credentials.json` в корень проекта

### 1.2 Создать тестовую таблицу

1. Создайте новую Google Таблицу
2. Откройте доступ к таблице для `client_email` из файла `google-credentials.json` с правами **Редактора**
3. Скопируйте ID таблицы из URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

Лист `stocks_coefs` будет создан автоматически при первом запуске.

---

## Шаг 2 — Настроить окружение

Скопируйте файл примера и заполните значения:

```bash
cp example.env .env
```

Откройте `.env`:

```env
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

APP_PORT=5000

# Токен WB API
WB_API_TOKEN=ваш_токен_здесь

# Путь к файлу учётных данных Google
GOOGLE_CREDENTIALS_PATH=./google-credentials.json

# ID Google Таблиц через запятую (одна или несколько)
SPREADSHEET_IDS=id_первой_таблицы,id_второй_таблицы
```

---

## Шаг 3 — Запуск

```bash
docker compose up
```

При первом запуске Docker соберёт образ, поднимет PostgreSQL, выполнит миграции, запишет список таблиц в БД и запустит сервис.

Сервис сразу выполнит первый сбор данных и синхронизацию таблиц, затем будет повторять это каждый час.

---

## Проверка работы

### Логи

```bash
docker compose logs -f app
```

Ожидаемый вывод:

```
DB ready
[scheduler] Starting — running initial job
[scheduler] Scheduled hourly job
[wb] Stored N warehouses for YYYY-MM-DD
[sheets] Tariffs synced to Google Sheets
```

### Данные в PostgreSQL

```bash
docker exec -it postgres psql -U postgres -d postgres -c \
  "SELECT warehouse_name, box_delivery_base, updated_at FROM tariffs_box WHERE date = CURRENT_DATE ORDER BY box_delivery_base LIMIT 10;"
```

### Google Таблица

Откройте таблицу — лист `stocks_coefs` должен содержать данные, отсортированные по коэффициенту доставки.

---

## Структура проекта

```
├── src/
│   ├── app.ts                          # Точка входа: миграции → планировщик
│   ├── config/
│   │   ├── env/env.ts                  # Валидация переменных окружения (zod)
│   │   └── knex/knexfile.ts            # Конфигурация knex
│   ├── postgres/
│   │   ├── knex.ts                     # Инстанс knex + утилиты миграций
│   │   ├── migrations/                 # Миграции БД
│   │   └── seeds/                      # Начальные данные (из SPREADSHEET_IDS)
│   ├── scheduler/index.ts              # Планировщик (hourly setInterval)
│   ├── services/
│   │   ├── wb/wb.service.ts            # Клиент WB API
│   │   ├── tariffs/tariffs.service.ts  # Операции с таблицей tariffs_box
│   │   └── sheets/sheets.service.ts    # Синхронизация с Google Sheets
│   ├── types/wb.ts                     # TypeScript-типы ответа WB API
│   └── utils/
│       ├── date.ts                     # getMoscowDate() — дата в московском часовом поясе
│       ├── knex.ts                     # CLI для управления миграциями
│       └── logger.ts                   # Логгер (log4js)
├── compose.yaml
├── Dockerfile
├── example.env
└── google-credentials.example.json     # Структура файла учётных данных Google
```

---

## Схема БД

**`spreadsheets`** — список подключённых Google Таблиц:

| Поле | Тип | Описание |
|---|---|---|
| spreadsheet_id | VARCHAR (PK) | ID Google Таблицы |

**`tariffs_box`** — тарифы коробов WB:

| Поле | Тип | Описание |
|---|---|---|
| id | SERIAL (PK) | |
| date | DATE | Дата тарифа |
| warehouse_name | VARCHAR | Название склада |
| box_delivery_base | DECIMAL | Базовый коэффициент доставки |
| box_delivery_liter | DECIMAL | Коэффициент доставки (литр) |
| box_storage_base | DECIMAL | Базовый коэффициент хранения |
| box_storage_liter | DECIMAL | Коэффициент хранения (литр) |
| box_delivery_and_storage_expr | VARCHAR | Формула тарифа |
| dt_next_box | DATE | Дата следующего изменения тарифа |
| dt_till_max | DATE | Дата окончания тарифа |
| created_at | TIMESTAMP | Время создания записи |
| updated_at | TIMESTAMP | Время последнего обновления |

Уникальный индекс по `(date, warehouse_name)` — повторные запросы в течение дня обновляют запись, не создают дубликаты.
