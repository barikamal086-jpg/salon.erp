const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // Verificar estado atual
    const result = await pool.query(`
      SELECT COUNT(*) as total FROM faturamento
    `);

    const uniqueResult = await pool.query(`
      SELECT COUNT(*) as unicos
      FROM (
        SELECT DISTINCT data, categoria, total FROM faturamento
      ) sub
    `);

    const r = result.rows[0];
    const u = uniqueResult.rows[0];
    console.log('\n📊 ESTADO ATUAL DO BANCO:');
    console.log('   Total de faturamentos: ' + r.total);
    console.log('   Combinações únicas: ' + u.unicos);

    // Notas fiscais
    const nfResult = await pool.query('SELECT COUNT(*) as total FROM notas_fiscais');
    console.log('   Notas fiscais: ' + nfResult.rows[0].total);
    console.log('');

    // Mostrar total por categoria
    const categoryResult = await pool.query(`
      SELECT categoria, COUNT(*) as total, CAST(SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END) AS DECIMAL(10,2)) as receita
      FROM faturamento
      GROUP BY categoria
      ORDER BY receita DESC
    `);

    console.log('💰 RECEITAS POR CATEGORIA:');
    let totalGeral = 0;
    categoryResult.rows.forEach(row => {
      const receita = parseFloat(row.receita || 0);
      totalGeral += receita;
      console.log('   ' + row.categoria.padEnd(10) + ': R$ ' + receita.toFixed(2) + ' (' + row.total + ' registros)');
    });
    console.log('   ' + '─'.repeat(40));
    console.log('   TOTAL      : R$ ' + totalGeral.toFixed(2));
    console.log('');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
})();
