/**
 * Debug: Diagnosticar por que despesas retornam 0
 * Execute com: node debug-despesas.js
 */

const { pool } = require('./database');
require('dotenv').config();

async function debugDespesas() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            DEBUG: Por que despesas = 0?                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const from = '2026-04-01';
    const to = '2026-04-30';

    // 1. Total de registros por tipo
    console.log('1️⃣  Total de registros por TIPO:\n');
    const tipoResult = await pool.query(`
      SELECT tipo, COUNT(*) as cnt, SUM(total) as total
      FROM faturamento
      GROUP BY tipo
    `);

    tipoResult.rows.forEach(row => {
      console.log(`   ${row.tipo}: ${row.cnt} registros, Total: R$ ${row.total || 0}`);
    });
    console.log();

    // 2. Registros de receita no período
    console.log('2️⃣  Receitas em Abril 2026:\n');
    const receitaResult = await pool.query(`
      SELECT COUNT(*) as cnt, SUM(total) as total
      FROM faturamento
      WHERE tipo = 'receita' AND data >= $1 AND data <= $2
    `, [from, to]);

    console.log(`   Registros: ${receitaResult.rows[0].cnt}`);
    console.log(`   Total: R$ ${receitaResult.rows[0].total || 0}\n`);

    // 3. Registros de despesa no período
    console.log('3️⃣  Despesas em Abril 2026:\n');
    const despesaResult = await pool.query(`
      SELECT COUNT(*) as cnt, SUM(total) as total
      FROM faturamento
      WHERE tipo = 'despesa' AND data >= $1 AND data <= $2
    `, [from, to]);

    console.log(`   Registros: ${despesaResult.rows[0].cnt}`);
    console.log(`   Total: R$ ${despesaResult.rows[0].total || 0}\n`);

    // 4. Despesas por categoria
    console.log('4️⃣  Despesas por Categoria em Abril 2026:\n');
    const despesaCatResult = await pool.query(`
      SELECT categoria, COUNT(*) as cnt, SUM(total) as total
      FROM faturamento
      WHERE tipo = 'despesa' AND data >= $1 AND data <= $2
      GROUP BY categoria
    `, [from, to]);

    if (despesaCatResult.rows.length === 0) {
      console.log('   ❌ NENHUMA DESPESA ENCONTRADA!\n');
    } else {
      despesaCatResult.rows.forEach(row => {
        console.log(`   ${row.categoria}: ${row.cnt} registros, Total: R$ ${row.total}`);
      });
      console.log();
    }

    // 5. Despesas específicas do Salão
    console.log('5️⃣  Despesas do Salão em Abril 2026:\n');
    const salaoResult = await pool.query(`
      SELECT COUNT(*) as cnt, SUM(total) as total
      FROM faturamento
      WHERE tipo = 'despesa' AND categoria = 'Salão' AND data >= $1 AND data <= $2
    `, [from, to]);

    console.log(`   Registros: ${salaoResult.rows[0].cnt}`);
    console.log(`   Total: R$ ${salaoResult.rows[0].total || 0}\n`);

    // 6. Amostra de despesas
    console.log('6️⃣  Amostra de 5 despesas (qualquer período):\n');
    const sampleResult = await pool.query(`
      SELECT id, data, categoria, tipo, total, tipo_despesa_id, descricao
      FROM faturamento
      WHERE tipo = 'despesa'
      LIMIT 5
    `);

    if (sampleResult.rows.length === 0) {
      console.log('   ❌ Nenhuma despesa no banco inteiro!\n');
    } else {
      sampleResult.rows.forEach((row, i) => {
        console.log(`   ${i+1}. Data: ${row.data}, Cat: ${row.categoria}, Total: R$ ${row.total}`);
        console.log(`      tipo_despesa_id: ${row.tipo_despesa_id}, Desc: ${row.descricao}`);
      });
      console.log();
    }

    // 7. Diagnóstico
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    DIAGNÓSTICO                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const totalDespesas = parseInt(despesaResult.rows[0].cnt || 0);

    if (totalDespesas === 0) {
      console.log('❌ PROBLEMA: Nenhuma despesa foi migrada do SQLite!\n');
      console.log('Possíveis causas:');
      console.log('1. SQLite não tinha registros de despesa');
      console.log('2. Despesas foram migradas mas com tipo != "despesa"');
      console.log('3. Filtro de categoria está excluindo as despesas');
      console.log('\nSolução: Verificar dados originais do SQLite ou inserir despesas de teste');
    } else {
      console.log(`✅ ${totalDespesas} despesas encontradas em Abril 2026\n`);
      console.log('Despesas deveriam aparecer no CMV Analysis.');
      console.log('Se não aparecem, o problema é na query de alocação.');
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

debugDespesas();
