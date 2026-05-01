/**
 * Script de diagnóstico para os 4 problemas reportados
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function problema1_Duplicatas() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        PROBLEMA 1: NÚMEROS DUPLICADOS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Contagem total
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM faturamento');
    const total = totalResult.rows[0].total;
    console.log(`📊 Total de registros: ${total}\n`);

    // 2. Verificar duplicatas
    console.log('🔍 Procurando duplicatas (mesma data + categoria + total)...\n');
    const dupsResult = await pool.query(`
      SELECT data, categoria, total, COUNT(*) as repeticoes
      FROM faturamento
      GROUP BY data, categoria, total
      HAVING COUNT(*) > 1
      ORDER BY repeticoes DESC
      LIMIT 10
    `);

    if (dupsResult.rows.length === 0) {
      console.log('✅ ÓTIMO! Nenhuma duplicata encontrada.\n');
    } else {
      console.log(`⚠️  ENCONTRADAS ${dupsResult.rows.length} COMBINAÇÕES DUPLICADAS:\n`);
      let totalDuplicados = 0;
      dupsResult.rows.forEach((row, i) => {
        const extras = row.repeticoes - 1;
        totalDuplicados += extras;
        const data = new Date(row.data).toISOString().split('T')[0];
        console.log(`   ${i+1}. ${data} | ${row.categoria.padEnd(10)} | R$ ${row.total} → ${row.repeticoes}x (remove ${extras})`);
      });
      console.log(`\n   TOTAL DE REGISTROS DUPLICADOS A REMOVER: ${totalDuplicados}`);
    }

    // 3. Verificar IDs únicos vs total
    const idsResult = await pool.query('SELECT COUNT(DISTINCT id) as ids_unicos FROM faturamento');
    const idsUnicos = idsResult.rows[0].ids_unicos;
    console.log(`\n📋 IDs únicos: ${idsUnicos}`);
    console.log(`   Total de registros: ${total}`);

    if (idsUnicos === total) {
      console.log('   ✅ IDs são únicos - duplicatas são por lógica (mesmos dados)\n');
      return { status: 'OK', duplicados: false, total };
    } else {
      console.log('   ⚠️  IDs estão duplicados também\n');
      return { status: 'DUPLICATAS', duplicados: true, total, idsUnicos };
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    return { status: 'ERROR', erro: err.message };
  }
}

async function problema2_NotasFiscais() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        PROBLEMA 2: NOTAS FISCAIS NÃO APARECEM              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Contar notas fiscais
    const nfResult = await pool.query('SELECT COUNT(*) as total FROM notas_fiscais');
    const totalNF = nfResult.rows[0].total;
    console.log(`📋 Total de notas fiscais: ${totalNF}\n`);

    if (totalNF === 0) {
      console.log('⚠️  Nenhuma nota fiscal no banco!\n');
      return { status: 'VAZIO', total: 0 };
    }

    // 2. Amostra de notas fiscais
    const sampleResult = await pool.query(`
      SELECT id, numero_nf, fornecedor_nome, data_emissao, valor_total, status
      FROM notas_fiscais
      LIMIT 5
    `);

    console.log(`✅ Amostra de ${sampleResult.rows.length} notas fiscais:\n`);
    sampleResult.rows.forEach((row, i) => {
      console.log(`   ${i+1}. NF ${row.numero_nf} | ${row.fornecedor_nome?.substring(0, 20)} | R$ ${row.valor_total} | Status: ${row.status}`);
    });

    // 3. Verificar status das notas
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as total
      FROM notas_fiscais
      GROUP BY status
    `);

    console.log(`\n📊 Status das notas fiscais:`);
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.total}`);
    });

    console.log();
    return { status: 'OK', total: totalNF, statusBreakdown: statusResult.rows };
  } catch (err) {
    console.error('❌ Erro:', err.message);
    return { status: 'ERROR', erro: err.message };
  }
}

async function problema3_Grafico() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        PROBLEMA 3: GRÁFICO NÃO CARREGA                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Verificar formato das datas
    const dateResult = await pool.query(`
      SELECT
        data,
        data::text as data_text,
        data::date as data_date,
        pg_typeof(data) as tipo_dados
      FROM faturamento
      LIMIT 5
    `);

    console.log('📅 Amostra de datas no banco:\n');
    dateResult.rows.forEach((row, i) => {
      console.log(`   ${i+1}. Original: ${row.data}`);
      console.log(`      ::text: ${row.data_text}`);
      console.log(`      ::date: ${row.data_date}`);
      console.log(`      Tipo: ${row.tipo_dados}`);
    });

    // 2. Teste de range query
    console.log(`\n🔍 Testando query de range (últimos 30 dias):\n`);
    const rangeResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        MIN(data) as data_min,
        MAX(data) as data_max
      FROM faturamento
      WHERE data >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const range = rangeResult.rows[0];
    console.log(`   Total com INTERVAL '30 days': ${range.total}`);
    console.log(`   Range: ${range.data_min} a ${range.data_max}\n`);

    if (range.total > 0) {
      console.log('✅ Range query funcionando corretamente\n');
      return { status: 'OK', totalUltimos30: range.total, dataTipo: dateResult.rows[0].tipo_dados };
    } else {
      console.log('⚠️  Nenhum registro nos últimos 30 dias\n');
      return { status: 'SEM_DADOS', totalUltimos30: 0 };
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    return { status: 'ERROR', erro: err.message };
  }
}

async function problema4_MenuCMV() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        PROBLEMA 4: ABA CMV POR CANAL SUMIU                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const fs = require('fs');
    const path = require('path');
    const indexPath = path.join(__dirname, './frontend/index.html');

    if (!fs.existsSync(indexPath)) {
      console.log('❌ Frontend não encontrado em:', indexPath);
      return { status: 'ERROR', erro: 'Frontend não encontrado' };
    }

    const indexContent = fs.readFileSync(indexPath, 'utf8');

    // Procurar por "CMV por Canal" ou similar
    const hasCMVTab = indexContent.includes('CMV por Canal') ||
                      indexContent.includes('cmv-por-canal') ||
                      indexContent.includes('cmvPorCanal');

    console.log('🔍 Procurando referência a "CMV por Canal" no frontend...\n');

    if (hasCMVTab) {
      console.log('✅ Referência encontrada no HTML\n');
      return { status: 'OK', encontrado: true };
    } else {
      console.log('⚠️  Referência NÃO ENCONTRADA no HTML\n');
      console.log('Procurar manualmente em: backend/frontend/index.html\n');
      return { status: 'NAO_ENCONTRADO', encontrado: false };
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    return { status: 'ERROR', erro: err.message };
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          DIAGNÓSTICO DE 4 PROBLEMAS PÓS-MIGRAÇÃO           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = {};

  results.problema1 = await problema1_Duplicatas();
  results.problema2 = await problema2_NotasFiscais();
  results.problema3 = await problema3_Grafico();
  results.problema4 = await problema4_MenuCMV();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                     RESUMO FINAL                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Problema 1 (Duplicatas):', results.problema1.status);
  console.log('Problema 2 (Notas Fiscais):', results.problema2.status);
  console.log('Problema 3 (Gráfico):', results.problema3.status);
  console.log('Problema 4 (Menu CMV):', results.problema4.status);
  console.log();

  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
