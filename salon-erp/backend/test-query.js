const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');
const db = new sqlite3.Database(dbPath);

const dataInicio = '2026-03-23';
const dataFim = '2026-04-22';

console.log(`🔍 Testando query de stats por categoria...\n`);
console.log(`Período: ${dataInicio} até ${dataFim}\n`);

const sql = `
  SELECT
    categoria,
    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa
  FROM faturamento
  WHERE data >= ? AND data <= ? AND categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
  GROUP BY categoria
  ORDER BY totalReceita DESC
`;

db.all(sql, [dataInicio, dataFim], (err, rows) => {
  if (err) {
    console.error('Erro:', err);
    process.exit(1);
  }

  console.log(`Resultados (${rows.length} categorias):\n`);
  rows.forEach(row => {
    console.log(`${row.categoria}: Receita R$ ${row.totalReceita}, Despesa R$ ${row.totalDespesa}`);
  });

  db.close();
  process.exit(0);
});
