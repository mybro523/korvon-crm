/* Проверка привязки Telegram через webhook (симуляция нажатия Start) */
require('dotenv').config({ path: '.env' });
const crypto = require('crypto');
const { Client } = require('pg');

const BASE = 'http://localhost:3001/api';
const secret = crypto
  .createHash('sha256')
  .update((process.env.JWT_SECRET || '') + ':tg-webhook')
  .digest('hex')
  .slice(0, 40);

let pass = 0, fail = 0;
const check = (n, c, e = '') => c ? (pass++, console.log('PASS ' + n)) : (fail++, console.log('FAIL ' + n + ' ' + e));

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // берём владельца и продавца
  const owner = (await c.query(`SELECT id, "fullName", role FROM users WHERE role='OWNER' LIMIT 1`)).rows[0];
  const seller = (await c.query(`SELECT id, "fullName", role FROM users WHERE role='SELLER' LIMIT 1`)).rows[0];

  // вставляем коды привязки (как это делает connect-link)
  const ownerCode = 'ownercode123';
  const sellerCode = 'sellercode456';
  const exp = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await c.query(`DELETE FROM telegram_link_codes`);
  await c.query(`INSERT INTO telegram_link_codes (code, "userId", "expiresAt") VALUES ($1,$2,$3),($4,$5,$3)`,
    [ownerCode, owner.id, exp, sellerCode, seller.id]);

  const webhook = (body, sec = secret) =>
    fetch(BASE + '/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': sec },
      body: JSON.stringify(body),
    }).then((r) => r.status);

  // владелец жмёт Start -> привязка chat 1001
  let st = await webhook({ message: { text: `/start ${ownerCode}`, chat: { id: 1001 } } });
  check('owner /start -> 200/201', st === 200 || st === 201, 'status ' + st);
  let row = (await c.query(`SELECT "telegramChatId" FROM users WHERE id=$1`, [owner.id])).rows[0];
  check('owner chatId bound = 1001', row.telegramChatId === '1001', row.telegramChatId);

  // код одноразовый — удалён после использования
  const codesLeft = (await c.query(`SELECT count(*)::int n FROM telegram_link_codes WHERE "userId"=$1`, [owner.id])).rows[0].n;
  check('owner code consumed', codesLeft === 0);

  // продавец жмёт Start -> привязка chat 2002, роль распознана автоматически
  st = await webhook({ message: { text: `/start ${sellerCode}`, chat: { id: 2002 } } });
  check('seller /start -> ok', st === 200 || st === 201);
  row = (await c.query(`SELECT "telegramChatId" FROM users WHERE id=$1`, [seller.id])).rows[0];
  check('seller chatId bound = 2002', row.telegramChatId === '2002', row.telegramChatId);

  // неправильный секрет отвергается
  st = await webhook({ message: { text: `/start ${ownerCode}`, chat: { id: 3003 } } }, 'wrong');
  check('wrong secret -> 401', st === 401, 'status ' + st);

  // /start с несуществующим кодом — не падает, не привязывает
  st = await webhook({ message: { text: `/start nonexistent`, chat: { id: 4004 } } });
  check('unknown code -> ok, no crash', st === 200 || st === 201);

  // повторное использование кода владельца (уже удалён) — не привязывает новый чат
  st = await webhook({ message: { text: `/start ${ownerCode}`, chat: { id: 5005 } } });
  row = (await c.query(`SELECT "telegramChatId" FROM users WHERE id=$1`, [owner.id])).rows[0];
  check('reused code does not rebind', row.telegramChatId === '1001');

  await c.end();
  console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
