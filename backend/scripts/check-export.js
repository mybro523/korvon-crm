/* проверка содержимого xlsx-экспорта */
const ExcelJS = require('exceljs');

const BASE = 'http://localhost:3001/api';

(async () => {
  const login = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  }).then((r) => r.json());
  const token = login.accessToken;

  for (const [name, path] of [
    ['SALES', '/export/sales?tz=Asia/Dushanbe'],
    ['WAREHOUSE', '/export/warehouse'],
  ]) {
    const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${token}` } });
    const buf = Buffer.from(await res.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    console.log(`=== ${name}: sheet "${ws.name}", rows ${ws.rowCount} ===`);
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      if (n <= 3 || n === ws.rowCount) {
        console.log(n, JSON.stringify(row.values.slice(1)));
      }
    });
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
