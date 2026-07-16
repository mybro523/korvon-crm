/* Полный сброс схемы (только для разработки!) */
const { Client } = require('pg');

const url =
  process.env.DATABASE_URL || 'postgresql://postgres:server0704@localhost:5432/korvon';

(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  console.log('SCHEMA RESET');
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
