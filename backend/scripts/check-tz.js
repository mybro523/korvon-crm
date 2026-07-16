const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres:server0704@localhost:5432/korvon' });
  await c.connect();
  const colType = await c.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sales' AND column_name='createdAt'`,
  );
  console.log('COLUMN TYPE:', JSON.stringify(colType.rows));
  const now = await c.query(`SELECT now() AS now, current_setting('TimeZone') AS tz`);
  console.log('DB NOW:', now.rows[0].now, 'TZ:', now.rows[0].tz);
  console.log('JS NOW UTC:', new Date().toISOString(), 'LOCAL:', new Date().toString());
  const sales = await c.query(
    `SELECT "totalAmount", "createdAt", to_char("createdAt", 'YYYY-MM-DD HH24:MI') AS raw FROM sales ORDER BY "createdAt"`,
  );
  sales.rows.forEach((r) => console.log(r.raw, '->', r.totalAmount));
  // как сравнивается ISO-строка с Z
  const cmp = await c.query(
    `SELECT count(*)::int AS cnt FROM sales WHERE "createdAt" >= $1`,
    ['2026-07-17T00:00:00.000Z'],
  );
  console.log('COUNT createdAt >= 2026-07-17T00:00:00.000Z :', cmp.rows[0].cnt);
  const cast = await c.query(`SELECT '2026-07-17T00:00:00.000Z'::timestamp AS t`);
  console.log('CAST Z->timestamp:', cast.rows[0].t);
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
