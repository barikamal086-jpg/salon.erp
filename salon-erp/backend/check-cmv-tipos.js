const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');
const db = new sqlite3.Database(dbPath);

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║          ANÁLISE: tipo_despesa_id NOS LANÇAMENTOS          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Query 1: Status geral
db.all(`
  SELECT
    COUNT(*) as total_lancamentos,
    COUNT(CASE WHEN tipo_despesa_id IS NOT NULL THEN 1 END) as com_tipo_despesa,
    COUNT(CASE WHEN tipo_despesa_id IS NULL THEN 1 END) as sem_tipo_despesa,
    ROUND(COUNT(CASE WHEN tipo_despesa_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as percentual_preenchido
  FROM faturamento
`, (err, rows) => {
  if (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }

  const row = rows[0];
  console.log('📊 STATUS GERAL:');
  console.log(`   Total de lançamentos: ${row.total_lancamentos}`);
  console.log(`   Com tipo_despesa_id: ${row.com_tipo_despesa} (${row.percentual_preenchido}%)`);
  console.log(`   SEM tipo_despesa_id (NULL): ${row.sem_tipo_despesa}\n`);

  // Query 2: Amostra dos que TÊM tipo_despesa_id
  db.all(`
    SELECT
      f.id,
      f.data,
      f.total,
      f.categoria,
      f.tipo,
      td.classificacao,
      td.subcategoria
    FROM faturamento f
    LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
    WHERE f.tipo_despesa_id IS NOT NULL
    LIMIT 5
  `, (err, rows) => {
    console.log('✅ AMOSTRA - Lançamentos COM tipo_despesa_id preenchido:\n');
    if (rows.length === 0) {
      console.log('   (Nenhum encontrado)\n');
    } else {
      rows.forEach((r, i) => {
        console.log(`   [${i+1}] ${r.data} | ${r.categoria} | R$ ${r.total} | ${r.classificacao} > ${r.subcategoria}`);
      });
      console.log();
    }

    // Query 3: Amostra dos que NÃO TÊM tipo_despesa_id
    db.all(`
      SELECT
        id,
        data,
        total,
        categoria,
        tipo,
        tipo_despesa_id
      FROM faturamento
      WHERE tipo_despesa_id IS NULL
      LIMIT 5
    `, (err, rows) => {
      console.log('❌ AMOSTRA - Lançamentos SEM tipo_despesa_id (NULL):\n');
      if (rows.length === 0) {
        console.log('   (Nenhum encontrado)\n');
      } else {
        rows.forEach((r, i) => {
          console.log(`   [${i+1}] ${r.data} | ${r.categoria} | R$ ${r.total} | tipo=${r.tipo}`);
        });
        console.log();
      }

      // Query 4: Distribuição por classificação (dos que têm tipo_despesa_id)
      db.all(`
        SELECT
          td.classificacao,
          COUNT(f.id) as qtd_lancamentos,
          SUM(f.total) as total_valor
        FROM faturamento f
        LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
        WHERE f.tipo_despesa_id IS NOT NULL
        GROUP BY td.classificacao
        ORDER BY qtd_lancamentos DESC
      `, (err, rows) => {
        console.log('📈 DISTRIBUIÇÃO POR CLASSIFICACAO (apenas com tipo_despesa_id):\n');
        if (rows.length === 0) {
          console.log('   (Nenhum dado)\n');
        } else {
          rows.forEach((r, i) => {
            console.log(`   ${r.classificacao}: ${r.qtd_lancamentos} lançamentos | Total: R$ ${r.total_valor?.toFixed(2) || 0}`);
          });
          console.log();
        }

        db.close();
      });
    });
  });
});
