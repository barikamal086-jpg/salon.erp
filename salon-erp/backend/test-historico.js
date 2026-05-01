/**
 * Teste do endpoint /api/faturamentos para Histórico
 * Execute com: node test-historico.js
 */

const { pool } = require('./database');
require('dotenv').config();

async function testarHistorico() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          TESTE: Endpoint /api/faturamentos (Histórico)     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Total de registros no banco
    console.log('1️⃣  Total de registros na tabela faturamento:\n');
    const totalResult = await pool.query('SELECT COUNT(*) as cnt FROM faturamento');
    const totalRegistros = parseInt(totalResult.rows[0].cnt);
    console.log(`   Total: ${totalRegistros} registros\n`);

    // 2. Registros nos últimos 365 dias
    console.log('2️⃣  Registros nos últimos 365 dias:\n');
    const dias365Result = await pool.query(`
      SELECT COUNT(*) as cnt FROM faturamento
      WHERE data >= CURRENT_DATE - INTERVAL '365 days'
    `);
    const registros365 = parseInt(dias365Result.rows[0].cnt);
    console.log(`   Registros: ${registros365}\n`);

    // 3. Registros por categoria
    console.log('3️⃣  Registros por categoria (últimos 365 dias):\n');
    const porCategoriaResult = await pool.query(`
      SELECT categoria, COUNT(*) as cnt FROM faturamento
      WHERE data >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY categoria
      ORDER BY cnt DESC
    `);

    if (porCategoriaResult.rows.length === 0) {
      console.log('   ❌ NENHUMA CATEGORIA ENCONTRADA!\n');
    } else {
      porCategoriaResult.rows.forEach(row => {
        console.log(`   ${row.categoria}: ${row.cnt} registros`);
      });
      console.log();
    }

    // 4. Primeiros 5 registros
    console.log('4️⃣  Primeiros 5 registros (últimos 365 dias):\n');
    const primeiroResult = await pool.query(`
      SELECT id, data, categoria, tipo, total FROM faturamento
      WHERE data >= CURRENT_DATE - INTERVAL '365 days'
      ORDER BY data DESC
      LIMIT 5
    `);

    if (primeiroResult.rows.length === 0) {
      console.log('   ❌ SEM DADOS!\n');
    } else {
      primeiroResult.rows.forEach((row, i) => {
        console.log(`   ${i+1}. ID: ${row.id}, Data: ${row.data}, Categoria: ${row.categoria}, Tipo: ${row.tipo}, Total: R$ ${row.total}`);
      });
      console.log();
    }

    // 5. Data mais antiga e mais recente
    console.log('5️⃣  Range de datas:\n');
    const dateRangeResult = await pool.query(`
      SELECT MIN(data) as data_minima, MAX(data) as data_maxima FROM faturamento
      WHERE data >= CURRENT_DATE - INTERVAL '365 days'
    `);

    const minData = dateRangeResult.rows[0].data_minima;
    const maxData = dateRangeResult.rows[0].data_maxima;
    console.log(`   Mais antiga: ${minData}`);
    console.log(`   Mais recente: ${maxData}\n`);

    // 6. Resumo por tipo (receita/despesa)
    console.log('6️⃣  Resumo por tipo:\n');
    const tipoResult = await pool.query(`
      SELECT tipo, COUNT(*) as cnt, SUM(total) as total FROM faturamento
      WHERE data >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY tipo
    `);

    tipoResult.rows.forEach(row => {
      console.log(`   ${row.tipo}: ${row.cnt} registros, Total: R$ ${parseFloat(row.total || 0).toFixed(2)}`);
    });
    console.log();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    DIAGNÓSTICO COMPLETO                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (registros365 === 0) {
      console.log('❌ PROBLEMA ENCONTRADO: Sem registros nos últimos 365 dias!');
      console.log('\n   Causas possíveis:');
      console.log('   1. Dados não foram migrados do SQLite');
      console.log('   2. Datas estão no formato incorreto');
      console.log('   3. Banco de dados está vazio');
    } else {
      console.log(`✅ DADOS ENCONTRADOS: ${registros365} registros nos últimos 365 dias`);
      console.log('\n   O endpoint /api/faturamentos deveria funcionar.');
      console.log('   Se o Histórico ainda não mostra dados, o problema é:');
      console.log('   - Frontend não chamando o endpoint');
      console.log('   - Resposta não sendo parseada corretamente');
      console.log('   - Erro 500 no endpoint');
    }
    console.log();

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

testarHistorico();
