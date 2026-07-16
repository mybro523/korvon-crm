# Корвон — CRM для склада, точек продаж и продаж

Веб-система автоматизации учёта товаров, продаж и остатков. Интерфейс полностью на **таджикском языке**.

## Возможности

- **Роли**: Владелец (Соҳиб) — полный доступ; Продавец (Фурӯшанда) — только продажи своей точки.
- **Склад (Анбор)**: товары с себестоимостью, количеством, единицей измерения, датой поступления; поиск, категории; стоимость склада.
- **Точки продаж (Нуқтаҳои фурӯш)**: независимые точки, передача товара склад ↔ точка, история перемещений, остатки по точке (продавец не видит себестоимость).
- **Продажи (Фурӯшҳо)**:
  - *Оптовая (Яклухт)*: количество + общая сумма → система считает цену за единицу;
  - *Розничная (Чакана)*: количество + цена за единицу → система считает сумму;
  - оплата: наличные / банковская карта;
  - **автосписание** остатка (склад или точка), защита от продажи сверх остатка даже при параллельных запросах (пессимистичные блокировки).
- **Уведомления**: после каждой продажи — уведомление владельцу в системе **и в Telegram** (дата, время, продавец, точка, товар, количество, сумма, оплата, тип).
- **Аналитика (Таҳлил)**: день / 7 дней / месяц / произвольный период; количество и сумма продаж, наличные vs карта, продано товаров, прибыль, график по дням, топ товаров, разрез по точкам.
- **Экспорт в Excel (.xlsx)**: продажи (весь список или за период, с учётом фильтров) и склад.
- **Пользователи**: создание продавцов/владельцев, привязка к точке, деактивация, смена пароля.

## Стек

| Слой | Технология | Архитектура | Деплой |
|---|---|---|---|
| Frontend | React 18 + TypeScript + Vite, Recharts | FSD (app/pages/widgets/features/entities/shared) | Vercel |
| Backend | NestJS 11 + TypeORM | Модульный монолит | Railway |
| БД | PostgreSQL (timestamptz) | — | Railway |

## Запуск локально

Требуется Node.js 18+ и PostgreSQL.

```bash
# Backend
cd backend
cp .env.example .env               # указать DATABASE_URL и JWT_SECRET
node scripts/create-db.js          # создаст БД korvon (или создайте вручную)
npm install
npm run build
npm run start:prod                 # http://localhost:3001/api

# Frontend (второй терминал)
cd frontend
cp .env.example .env               # VITE_API_URL=http://localhost:3001/api
npm install
npm run dev                        # http://localhost:5173
```

При первом запуске создаётся владелец: **admin / admin123** — сразу смените пароль в разделе «Корбарон».

## Деплой

### Backend → Railway

1. Создайте проект в Railway, добавьте плагин **PostgreSQL**.
2. Добавьте сервис из GitHub-репозитория, **Root Directory: `backend`**.
3. Переменные окружения:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference на плагин)
   - `JWT_SECRET` = длинная случайная строка
   - `DB_SSL` = `false` (для internal-подключения) или `true` для внешнего прокси
4. Railway сам соберёт (`npm run build`) и запустит (`node dist/main.js`), порт берётся из `PORT`.

### Frontend → Vercel

1. Импортируйте репозиторий, **Root Directory: `frontend`**, Framework: Vite.
2. Переменная окружения: `VITE_API_URL` = `https://<ваш-backend>.up.railway.app/api`.
3. SPA-роутинг уже настроен через `frontend/vercel.json`.

### Telegram-уведомления

1. В Telegram создайте бота через **@BotFather** (`/newbot`) — получите токен.
2. Напишите своему боту любое сообщение.
3. Узнайте свой Chat ID через **@userinfobot**.
4. В системе: **Танзимот → Огоҳиномаҳои Telegram** — вставьте токен и Chat ID, нажмите «Санҷиши пайвастшавӣ».

## Структура

```
backend/src/
  auth/ users/ products/ points/ sales/ analytics/
  notifications/ settings/ export/ seed/
  common/ (guards, decorators, sale-message, numbers)
  entities/ (User, Product, SalesPoint, PointStock, Transfer, Sale, Notification, Setting)
frontend/src/
  app/ (providers, router, styles)
  pages/ (login, analytics, warehouse, points, point-detail, sales, sale-new, my-stock, users, notifications, settings)
  widgets/ (layout)
  features/ (sale-form, product-form, point-form, user-form, transfer-form, return-form)
  entities/ (user, product, point, sale, notification, analytics, settings)
  shared/ (api, ui, i18n, lib, config)
```
