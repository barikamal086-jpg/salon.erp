/**
 * Verifica se os totais de abril batem com os valores esperados
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyTotals() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       VERIFICAÇÃO DE TOTAIS - ABRIL 2026                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const from = '2026-04-01';
    const to = '2026-04-30';

    // 1. Total geral de receita
    console.log('📊 TOTAL DE RECEITA (Abril 2026):\n');

    const totalResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END), 0)::DECIMAL(10,2) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo='despesa' THEN total ELSE 0 END), 0)::DECIMAL(10,2) as totalDespesa
      FROM faturamento
      WHERE data >= $1 AND data <= $2
    `, [from, to]);

    const totalReceita = parseFloat(totalResult.rows[0].totalReceita || 0);
    const totalDespesa = parseFloat(totalResult.rows[0].totalDespesa || 0);

    console.log(`   Total Receita: R$ ${totalReceita.toFixed(2)}`);
    console.log(`   Esperado:      R$ 255.971,64`);
    console.log(`   Status: ${Math.abs(totalReceita - 255971.64) < 0.01 ? '✅ OK' : '❌ DIFERENTE'}\n`);

    // 2. Receita por categoria
    console.log('💰 RECEITA POR CATEGORIA:\n');

    const byCategory = await pool.query(`
      SELECT
        categoria,
        COALESCE(SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END), 0)::DECIMAL(10,2) as receita,
        COALESCE(SUM(CASE WHEN tipo='despesa' THEN total ELSE 0 END), 0)::DECIMAL(10,2) as despesa
      FROM faturamento
      WHERE data >= $1 AND data <= $2
      GROUP BY categoria
      ORDER BY receita DESC
    `, [from, to]);

    const expected = {
      'Salão': 96785.94,
      'Keeta': 59726.36,
      'iFood': 56389.25,
      '99Food': 43070.09
    };

    byCategory.rows.forEach(row => {
      const receita = parseFloat(row.receita || 0);
      const expectedValue = expected[row.categoria] || 0;
      const match = Math.abs(receita - expectedValue) < 0.01;

      console.log(`   ${row.categoria.padEnd(10)}: R$ ${receita.toFixed(2).padStart(12)}`);
      console.log(`   ${' '.repeat(10)}  Esperado: R$ ${expectedValue.toFixed(2).padStart(12)} ${match ? '✅' : '❌'}`);
      console.log();
    });

    // 3. Calcular líquidos esperados
    console.log('📈 LÍQUIDO POR CATEGORIA (Receita - Despesa):\n');

    const liquidosEsperados = {
      'iFood': 18658.00,
      '99Food': 16350.55,
      'Keeta': 9817.54,
      'Salão': 15042.09
    };

    const liquidos = await pool.query(`
      SELECT
        categoria,
        COALESCE(SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END), 0)::DECIMAL(10,2) as receita,
        COALESCE(SUM(CASE WHEN tipo='despesa' THEN total ELSE 0 END), 0)::DECIMAL(10,2) as despesa
      FROM faturamento
      WHERE data >= $1 AND data <= $2
      GROUP BY categoria
      ORDER BY categoria
    `, [from, to]);

    liquidos.rows.forEach(row => {
      const receita = parseFloat(row.receita || 0);
      const despesa = parseFloat(row.despesa || 0);
      const liquido = receita - despesa;
      const expectedLiquido = liquidosEsperados[row.categoria] || 0;
      const match = Math.abs(liquido - expectedLiquido) < 0.01;

      console.log(`   ${row.categoria.padEnd(10)}: R$ ${liquido.toFixed(2).padStart(12)}`);
      console.log(`   ${' '.repeat(10)}  Esperado: R$ ${expectedLiquido.toFixed(2).padStart(12)} ${match ? '✅' : '❌'}`);
      console.log();
    });

    // 4. Resumo final
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    RESUMO FINAL                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const totalMatch = Math.abs(totalReceita - 255971.64) < 0.01;
    console.log(totalMatch ? '✅ TOTAIS CONFIRMADOS!' : '⚠️  Totais diferentes - verificar dados');
    console.log('');

    await pool.end();
    process.exit(totalMatch ? 0 : 1);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

verifyTotals();
