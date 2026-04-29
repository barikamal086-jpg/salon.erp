const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');
const db = new sqlite3.Database(dbPath);

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║          AUDITORIA: Onde está o CMV que falta?             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const dataInicio = '2026-04-01';
const dataFim = '2026-04-30';

// Query 1: Total de CMV esperado
db.all(`
  SELECT SUM(f.total) as total_cmv
  FROM faturamento f
  LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
  WHERE f.tipo = 'despesa'
    AND f.categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
    AND td.classificacao = 'CMV'
    AND f.data BETWEEN ? AND ?
`, [dataInicio, dataFim], (err, rows) => {
  const totalCMV = rows[0]?.total_cmv || 0;
  console.log(`📊 TOTAL CMV SEM FILTRO: R$ ${totalCMV.toFixed(2)}\n`);

  // Query 2: CMV por status de tipo_despesa_id
  db.all(`
    SELECT
      CASE
        WHEN f.tipo_despesa_id IS NULL THEN 'tipo_despesa_id = NULL'
        WHEN td.classificacao IS NULL THEN 'tipo_despesa existe mas classificacao NULL'
        WHEN td.classificacao != 'CMV' THEN 'classificacao = ' || td.classificacao
        ELSE 'classificacao = CMV'
      END as status,
      COUNT(f.id) as qtd,
      SUM(f.total) as total
    FROM faturamento f
    LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
    WHERE f.tipo = 'despesa'
      AND f.categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
      AND f.data BETWEEN ? AND ?
    GROUP BY status
    ORDER BY total DESC
  `, [dataInicio, dataFim], (err, rows) => {
    console.log('🔍 BREAKDOWN DE TODAS AS DESPESAS:\n');
    rows.forEach(r => {
      console.log(`   ${r.status}`);
      console.log(`   └─ ${r.qtd} lançamentos | R$ ${r.total.toFixed(2)}\n`);
    });

    // Query 3: Lançamentos CMV que NÃO estão no cálculo
    db.all(`
      SELECT f.id, f.data, f.total, f.categoria, td.classificacao, td.subcategoria, f.tipo_despesa_id
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE f.tipo = 'despesa'
        AND f.categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
        AND f.data BETWEEN ? AND ?
        AND (f.tipo_despesa_id IS NULL OR td.classificacao IS NULL OR td.classificacao != 'CMV')
      ORDER BY f.total DESC
      LIMIT 20
    `, [dataInicio, dataFim], (err, rows) => {
      console.log('⚠️  DESPESAS NÃO CONTABILIZADAS COMO CMV:\n');
      if (rows.length === 0) {
        console.log('   (Nenhuma encontrada)\n');
      } else {
        let total = 0;
        rows.forEach(r => {
          total += r.total;
          console.log(`   ${r.data} | ${r.categoria.padEnd(12)} | R$ ${r.total.toFixed(2).padStart(10)} | tipo_id=${r.tipo_despesa_id || 'NULL'} | ${r.classificacao || 'NULL'}`);
        });
        console.log(`\n   SUBTOTAL DAS EXCLUÍDAS: R$ ${total.toFixed(2)}\n`);

        // Calcular diferença
        const diferenca = 34761.85 - totalCMV;
        console.log(`📊 RESUMO:`);
        console.log(`   CMV validado (esperado):    R$ 34.761,85`);
        console.log(`   CMV no cálculo (atual):     R$ ${totalCMV.toFixed(2)}`);
        console.log(`   DIFERENÇA:                  R$ ${Math.abs(diferenca).toFixed(2)}`);
        console.log(`   EXCLUÍDAS (sample):         R$ ${total.toFixed(2)}\n`);
      }

      db.close();
    });
  });
});
