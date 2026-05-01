const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'salon-erp.db'));

db.all(`
  SELECT DISTINCT categoria
  FROM faturamento
  ORDER BY categoria
`, (err, rows) => {
  if (err) {
    console.error('Erro:', err);
    process.exit(1);
  }

  console.log('\n📊 CATEGORIAS NO SQLite ORIGINAL:\n');
  rows.forEach((row, i) => {
    console.log(`  ${i+1}. ${row.categoria}`);
  });

  console.log('\n📝 Total de categorias distintas:', rows.length);

  // Contar por categoria
  db.all(`
    SELECT categoria, COUNT(*) as total, SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END) as receita
    FROM faturamento
    GROUP BY categoria
    ORDER BY receita DESC
  `, (err, counts) => {
    if (err) {
      console.error('Erro:', err);
      process.exit(1);
    }

    console.log('\n💰 DISTRIBUIÇÃO:');
    counts.forEach(row => {
      console.log(`  ${row.categoria.padEnd(40)}: ${row.total} registros | R$ ${row.receita || 0}`);
    });

    console.log('\n');
    db.close();
  });
});
