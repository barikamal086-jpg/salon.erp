const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando dados RAW de Keeta...\n');

db.all(`
  SELECT id, data, total, categoria, tipo, tipo_despesa_id
  FROM faturamento
  WHERE categoria = 'Keeta'
  ORDER BY data DESC
`, (err, rows) => {
  if (err) {
    console.error('Erro:', err);
    process.exit(1);
  }

  console.log(`Encontrados ${rows.length} registros de Keeta:\n`);
  rows.forEach((row, i) => {
    console.log(`${i+1}. ID: ${row.id}, Data: ${row.data}, Valor: ${row.total}, Tipo: ${row.tipo}`);
  });

  db.close();
  process.exit(0);
});
