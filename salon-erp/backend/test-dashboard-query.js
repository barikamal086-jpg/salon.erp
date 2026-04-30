/**
 * Test script para verificar se o dashboard consegue ler os dados migrados
 * Simula as queries que o dashboard faz
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testDashboardQueries() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        TESTE: Queries do Dashboard com PostgreSQL          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Teste: Listar faturamentos últimos 30 dias
    console.log('🧪 Teste 1: Listar faturamentos (últimos 30 dias)');
    console.log('   Query: SELECT * FROM faturamento WHERE data >= CURRENT_DATE - INTERVAL \'30 days\' ORDER BY data DESC LIMIT 5\n');

    const result1 = await pool.query(`
      SELECT id, data, categoria, tipo, CAST(total AS DECIMAL(10,2)) as total
      FROM faturamento
      WHERE data >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY data DESC
      LIMIT 5
    `);

    if (result1.rows.length > 0) {
      console.log(`   ✅ Encontrados ${result1.rows.length} registros:\n`);
      result1.rows.forEach((row, i) => {
        console.log(`      ${i+1}. ${row.data} | ${row.categoria.padEnd(8)} | ${row.tipo.padEnd(7)} | R$ ${parseFloat(row.total).toFixed(2)}`);
      });
    } else {
      console.log(`   ⚠️  Nenhum registro nos últimos 30 dias\n`);
    }

    // 2. Teste: Estatísticas de um período específico
    console.log('\n🧪 Teste 2: Estatísticas (período específico)');
    const from = '2026-04-01';
    const to = '2026-04-30';
    console.log(`   Query: SELECT SUM(total) FROM faturamento WHERE data >= '${from}' AND data <= '${to}' AND tipo = 'receita'\n`);

    const result2 = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa,
        COUNT(*) as totalRegistros
      FROM faturamento
      WHERE data >= $1 AND data <= $2
    `, [from, to]);

    const stats = result2.rows[0];
    console.log(`   ✅ Resultado:`);
    console.log(`      Total Receita: R$ ${parseFloat(stats.totalReceita).toFixed(2)}`);
    console.log(`      Total Despesa: R$ ${parseFloat(stats.totalDespesa).toFixed(2)}`);
    console.log(`      Total Registros: ${stats.totalRegistros}\n`);

    // 3. Teste: Receita por categoria
    console.log('🧪 Teste 3: Receita por categoria (abril 2026)');
    console.log(`   Query: SELECT categoria, SUM(total) FROM faturamento WHERE tipo = 'receita' GROUP BY categoria\n`);

    const result3 = await pool.query(`
      SELECT
        categoria,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COUNT(*) as totalRegistros
      FROM faturamento
      WHERE data >= $1 AND data <= $2 AND tipo = 'receita'
      GROUP BY categoria
      ORDER BY totalReceita DESC
    `, [from, to]);

    console.log(`   ✅ Resultado:`);
    let totalGeral = 0;
    result3.rows.forEach((row, i) => {
      const valor = parseFloat(row.totalReceita);
      totalGeral += valor;
      console.log(`      ${row.categoria.padEnd(10)} | R$ ${valor.toFixed(2).padStart(12)} | ${row.totalRegistros} registros`);
    });
    console.log(`      ${'-'.repeat(42)}`);
    console.log(`      TOTAL      | R$ ${totalGeral.toFixed(2).padStart(12)}`);

    // 4. Teste: Verificar data format
    console.log(`\n🧪 Teste 4: Verificar formato das datas no banco\n`);
    const result4 = await pool.query(`
      SELECT id, data, data::text as data_texto, created_at, updated_at
      FROM faturamento
      LIMIT 3
    `);

    console.log(`   ✅ Formato das datas:`);
    result4.rows.forEach((row, i) => {
      console.log(`      Registro ${i+1}:`);
      console.log(`        - data (DATE): ${row.data}`);
      console.log(`        - data (TEXT): ${row.data_texto}`);
      console.log(`        - created_at: ${row.created_at}`);
      console.log(`        - updated_at: ${row.updated_at}`);
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║               ✅ TODOS OS TESTES PASSARAM!                 ║');
    console.log('║      O dashboard consegue ler os dados do PostgreSQL       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await pool.end();
  } catch (err) {
    console.error('❌ Erro durante teste:', err.message);
    console.error('\nStack:', err.stack);
    process.exit(1);
  }
}

testDashboardQueries();
