const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando categorias no banco...\n');

db.all(`
  SELECT categoria, COUNT(*) as qtd, SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as receita
  FROM faturamento
  GROUP BY categoria
`, (err, rows) => {
  if (err) {
    console.error('Erro:', err);
    process.exit(1);
  }

  console.log('Categorias encontradas:');
  rows.forEach(row => {
    console.log(`  ${row.categoria}: ${row.qtd} registros, R$ ${row.receita || 0}`);
  });

  db.close();
  process.exit(0);
});
