#!/usr/bin/env node

/**
 * 🔧 TEST: Verificar se SQL está retornando valor correto para despesas
 */

const { pool } = require('./database');

async function testSQL() {
  try {
    console.log('\n═'.repeat(80));
    console.log('🔧 TEST SQL: Despesas de 2026-05-01 a 2026-05-08');
    console.log('═'.repeat(80) + '\n');

    const dataInicio = '2026-05-01';
    const dataFim = '2026-05-08';

    // 1. TESTE 1: Despesa Total (simples)
    console.log('1️⃣  DESPESA TOTAL SIMPLES');
    const result1 = await pool.query(`
      SELECT
        SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
      FROM faturamento
      WHERE data >= $1 AND data <= $2
    `, [dataInicio, dataFim]);

    console.log(`   SQL SUM(tipo='despesa'): R$ ${parseFloat(result1.rows[0].totaldespesa).toFixed(2)}\n`);

    // 2. TESTE 2: Contar registros
    console.log('2️⃣  CONTAGEM DE REGISTROS');
    const result2 = await pool.query(`
      SELECT
        COUNT(*) as totalRegistros,
        COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as numReceitas,
        COUNT(CASE WHEN tipo = 'despesa' THEN 1 END) as numDespesas
      FROM faturamento
      WHERE data >= $1 AND data <= $2
    `, [dataInicio, dataFim]);

    const r = result2.rows[0];
    console.log(`   Total registros: ${r.totalregistros}`);
    console.log(`   Receitas: ${r.numreceitas}`);
    console.log(`   Despesas: ${r.numdespesas}\n`);

    // 3. TESTE 3: Despesas por categoria
    console.log('3️⃣  DESPESAS POR CATEGORIA');
    const result3 = await pool.query(`
      SELECT
        categoria,
        COUNT(*) as numRegistros,
        SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
      FROM faturamento
      WHERE data >= $1 AND data <= $2 AND tipo = 'despesa'
      GROUP BY categoria
      ORDER BY totalDespesa DESC
    `, [dataInicio, dataFim]);

    let totalDespesasVerificacao = 0;
    result3.rows.forEach(row => {
      const valor = parseFloat(row.totaldespesa);
      console.log(`   ${row.categoria}: ${row.numregistros} registros = R$ ${valor.toFixed(2)}`);
      totalDespesasVerificacao += valor;
    });
    console.log(`   TOTAL: R$ ${totalDespesasVerificacao.toFixed(2)}\n`);

    // 4. TESTE 4: Query EXATA que obterStats usa
    console.log('4️⃣  QUERY EXATA (obterStats)');
    const result4 = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalLiquido,
        COUNT(DISTINCT data) as dias,
        COUNT(*) as totalEntradas
      FROM faturamento
      WHERE data >= $1 AND data <= $2
    `, [dataInicio, dataFim]);

    const stats = result4.rows[0];
    console.log(`   totalReceita:  R$ ${parseFloat(stats.totalreceita).toFixed(2)}`);
    console.log(`   totalDespesa:  R$ ${parseFloat(stats.totaldespesa).toFixed(2)}`);
    console.log(`   totalLiquido:  R$ ${parseFloat(stats.totalliquido).toFixed(2)}`);
    console.log(`   dias:          ${stats.dias}`);
    console.log(`   totalEntradas: ${stats.totalentradas}\n`);

    // 5. COMPARAÇÃO
    console.log('5️⃣  COMPARAÇÃO COM HISTÓRICO');
    console.log(`   Histórico Despesa: R$ 8.718,01`);
    console.log(`   SQL Despesa:       R$ ${parseFloat(stats.totaldespesa).toFixed(2)}`);

    const diff = parseFloat(stats.totaldespesa) - 8718.01;
    if (Math.abs(diff) < 0.01) {
      console.log(`   Diferença:         R$ 0,00 ✅\n`);
    } else {
      console.log(`   Diferença:         R$ ${diff.toFixed(2)} ❌\n`);
    }

    // 6. LISTAR TODAS AS DESPESAS
    console.log('6️⃣  LISTA COMPLETA DE DESPESAS');
    const result6 = await pool.query(`
      SELECT
        id, data, categoria, tipo, total,
        COALESCE(td.subcategoria, 'N/A') as tipo_despesa
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE data >= $1 AND data <= $2 AND tipo = 'despesa'
      ORDER BY data DESC, total DESC
    `, [dataInicio, dataFim]);

    let somaVerificacao = 0;
    console.log(`   ID    │ Data      │ Categoria  │ Tipo Despesa           │ Total`);
    console.log(`   ──────┼───────────┼────────────┼────────────────────────┼──────────`);

    result6.rows.forEach(row => {
      const valor = parseFloat(row.total);
      somaVerificacao += valor;
      console.log(`   ${String(row.id).padEnd(5)} │ ${row.data} │ ${row.categoria.padEnd(10)} │ ${String(row.tipo_despesa).substring(0, 22).padEnd(22)} │ ${valor.toFixed(2)}`);
    });

    console.log(`   ──────┴───────────┴────────────┴────────────────────────┴──────────`);
    console.log(`   SOMA VERIFICADA: R$ ${somaVerificacao.toFixed(2)}\n`);

    console.log('═'.repeat(80));
    console.log('✅ TESTE CONCLUÍDO');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testSQL();
