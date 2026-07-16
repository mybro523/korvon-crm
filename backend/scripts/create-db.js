/* Создаёт базу данных korvon, если её ещё нет (для локальной разработки) */
const { Client } = require('pg');

const adminUrl =
  process.env.ADMIN_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
const dbName = process.env.DB_NAME || 'korvon';

(async () => {
  const client = new Client({ connectionString: adminUrl });
  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`DB ${dbName} CREATED`);
    } else {
      console.log(`DB ${dbName} EXISTS`);
    }
  } catch (e) {
    console.log('CONNECT FAIL: ' + e.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
})();
