const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando estrutura da tabela faturamento...\n');

db.all("PRAGMA table_info(faturamento)", (err, rows) => {
  if (err) {
    console.error('Erro:', err);
    process.exit(1);
  }

  console.log('Colunas encontradas:');
  rows.forEach(row => {
    console.log(`  - ${row.name} (${row.type})`);
  });

  db.close();
  process.exit(0);
});
