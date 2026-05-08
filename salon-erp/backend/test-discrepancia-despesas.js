#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNÓSTICO: Discrepância de Despesas entre KPI e Histórico
 *
 * Executa:
 * node test-discrepancia-despesas.js --from 2026-05-01 --to 2026-05-08
 */

const { pool } = require('./database');

async function runDiagnostics(dataInicio, dataFim) {
  try {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('🔍 DIAGNÓSTICO DE DISCREPÂNCIA DE DESPESAS');
    console.log('═'.repeat(80));
    console.log(`Período: ${dataInicio} a ${dataFim}`);
    console.log('═'.repeat(80));

    // ==========================================
    // 1. TOTAIS DIRETO DO BANCO (SQL SUM)
    // ==========================================
    console.log('\n1️⃣  TOTAIS DIRETO DO BANCO (Backend Query)\n');

    const sqlTotal = `
      SELECT
        COUNT(*) as total_registros,
        COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as num_receitas,
        COUNT(CASE WHEN tipo = 'despesa' THEN 1 END) as num_despesas,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalLiquido
      FROM faturamento
      WHERE data >= $1 AND data <= $2
    `;

    const resultTotal = await pool.query(sqlTotal, [dataInicio, dataFim]);
    const totaisBanco = resultTotal.rows[0];

    console.log(`📊 Resultado SQL (obterStats):`);
    console.log(`   Total Receitas:      ${totaisBanco.num_receitas} registros`);
    console.log(`   Total Despesas:      ${totaisBanco.num_despesas} registros`);
    console.log(`   totalReceita (SQL):  R$ ${parseFloat(totaisBanco.totalreceita).toFixed(2)}`);
    console.log(`   totalDespesa (SQL):  R$ ${parseFloat(totaisBanco.totaldespesa).toFixed(2)}`);
    console.log(`   totalLíquido (SQL):  R$ ${parseFloat(totaisBanco.totalliquido).toFixed(2)}`);

    // ==========================================
    // 2. VERIFICAR POR TIPO DE DESPESA
    // ==========================================
    console.log('\n2️⃣  DESPESAS DETALHADAS POR TIPO\n');

    const sqlDetalhado = `
      SELECT
        COALESCE(td.subcategoria, 'SEM CATEGORIA') as tipo_despesa,
        COUNT(f.id) as num_registros,
        COALESCE(SUM(f.total), 0) as total_despesa,
        AVG(f.total) as media,
        MAX(f.total) as maximo,
        MIN(f.total) as minimo,
        STRING_AGG(DISTINCT f.categoria, ', ') as categorias
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE f.tipo = 'despesa' AND f.data >= $1 AND f.data <= $2
      GROUP BY td.subcategoria
      ORDER BY total_despesa DESC
    `;

    const resultDetalhado = await pool.query(sqlDetalhado, [dataInicio, dataFim]);

    resultDetalhado.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.tipo_despesa}`);
      console.log(`      • Registros: ${row.num_registros}`);
      console.log(`      • Total: R$ ${parseFloat(row.total_despesa).toFixed(2)}`);
      console.log(`      • Categorias: ${row.categorias}`);
      console.log(`      • Média: R$ ${parseFloat(row.media).toFixed(2)}`);
      console.log(`      • Min-Max: R$ ${parseFloat(row.minimo).toFixed(2)} ~ R$ ${parseFloat(row.maximo).toFixed(2)}`);
    });

    // ==========================================
    // 3. VERIFICAR REGISTROS COM STATUS
    // ==========================================
    console.log('\n3️⃣  FILTRO DE STATUS\n');

    const sqlStatus = `
      SELECT
        status,
        COUNT(*) as num_registros,
        COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as receitas,
        COUNT(CASE WHEN tipo = 'despesa' THEN 1 END) as despesas,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa
      FROM faturamento
      WHERE data >= $1 AND data <= $2
      GROUP BY status
      ORDER BY status
    `;

    const resultStatus = await pool.query(sqlStatus, [dataInicio, dataFim]);

    console.log(`📌 Distribuição por Status:`);
    resultStatus.rows.forEach(row => {
      const status = row.status ? 'ENVIADO (true)' : 'NÃO ENVIADO (false)';
      console.log(`\n   ${status}`);
      console.log(`   • Total: ${row.num_registros} registros`);
      console.log(`   • Receitas: ${row.receitas} | Despesas: ${row.despesas}`);
      console.log(`   • Receita Total: R$ ${parseFloat(row.totalreceita).toFixed(2)}`);
      console.log(`   • Despesa Total: R$ ${parseFloat(row.totaldespesa).toFixed(2)}`);
    });

    // ==========================================
    // 4. VERIFICAR POR CATEGORIA
    // ==========================================
    console.log('\n4️⃣  DISTRIBUIÇÃO POR CATEGORIA\n');

    const sqlCategoria = `
      SELECT
        categoria,
        COUNT(*) as num_registros,
        COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as receitas,
        COUNT(CASE WHEN tipo = 'despesa' THEN 1 END) as despesas,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa
      FROM faturamento
      WHERE data >= $1 AND data <= $2
      GROUP BY categoria
      ORDER BY totalDespesa DESC
    `;

    const resultCategoria = await pool.query(sqlCategoria, [dataInicio, dataFim]);

    console.log(`🏪 Totais por Categoria:`);
    resultCategoria.rows.forEach(row => {
      console.log(`\n   ${row.categoria}`);
      console.log(`   • Receitas: ${row.receitas} reg. = R$ ${parseFloat(row.totalreceita).toFixed(2)}`);
      console.log(`   • Despesas: ${row.despesas} reg. = R$ ${parseFloat(row.totaldespesa).toFixed(2)}`);
    });

    // ==========================================
    // 5. VERIFICAR OUTLIERS (Valores muito altos/baixos)
    // ==========================================
    console.log('\n5️⃣  OUTLIERS (Valores Suspeitos)\n');

    const sqlOutliers = `
      SELECT
        id,
        data,
        tipo,
        categoria,
        total,
        COALESCE(td.subcategoria, 'N/A') as tipo_despesa,
        status
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE f.data >= $1 AND f.data <= $2
      AND (
        f.total > 10000  -- Muito alto
        OR f.total < 0   -- Negativo (erro!)
      )
      ORDER BY f.total DESC
    `;

    const resultOutliers = await pool.query(sqlOutliers, [dataInicio, dataFim]);

    if (resultOutliers.rows.length === 0) {
      console.log('   ✅ Nenhum outlier encontrado (OK)');
    } else {
      console.log(`   ⚠️  ${resultOutliers.rows.length} valores suspeitos encontrados:`);
      resultOutliers.rows.forEach((row, idx) => {
        console.log(`\n   ${idx + 1}. ID ${row.id}`);
        console.log(`      • Data: ${row.data}`);
        console.log(`      • Tipo: ${row.tipo} | Categoria: ${row.categoria}`);
        console.log(`      • Valor: R$ ${parseFloat(row.total).toFixed(2)}`);
        console.log(`      • Tipo Despesa: ${row.tipo_despesa}`);
        console.log(`      • Status: ${row.status ? 'ENVIADO' : 'NÃO ENVIADO'}`);
      });
    }

    // ==========================================
    // 6. COMPARAÇÃO: O que o Frontend deveria ver
    // ==========================================
    console.log('\n6️⃣  SIMULAÇÃO: O que o Frontend Calcula\n');

    const sqlTodos = `
      SELECT
        id,
        data,
        tipo,
        total
      FROM faturamento
      WHERE data >= CURRENT_DATE - INTERVAL '365 days'
      ORDER BY data DESC
    `;

    const resultTodos = await pool.query(sqlTodos);
    const receitas = resultTodos.rows;

    console.log(`   Total de registros carregados (365 dias): ${receitas.length}`);

    // Filtrar para o período (como faz o frontend)
    const receitasFiltradas = receitas.filter(r =>
      r.data >= dataInicio && r.data <= dataFim
    );

    console.log(`   Registros após filtro de período: ${receitasFiltradas.length}`);

    // Calcular como o frontend (JavaScript)
    const totalReceitaFrontend = receitasFiltradas
      .filter(r => r.tipo === 'receita')
      .reduce((acc, r) => acc + parseFloat(r.total), 0);

    const totalDespesaFrontend = receitasFiltradas
      .filter(r => r.tipo === 'despesa')
      .reduce((acc, r) => acc + parseFloat(r.total), 0);

    console.log(`\n   📊 Totais Calculados (JavaScript):`);
    console.log(`      totalReceita (Frontend): R$ ${totalReceitaFrontend.toFixed(2)}`);
    console.log(`      totalDespesa (Frontend): R$ ${totalDespesaFrontend.toFixed(2)}`);

    // ==========================================
    // 7. COMPARAÇÃO FINAL
    // ==========================================
    console.log('\n7️⃣  COMPARAÇÃO: Backend vs Frontend\n');

    const diffReceita = Math.abs(
      parseFloat(totaisBanco.totalreceita) - totalReceitaFrontend
    );
    const diffDespesa = Math.abs(
      parseFloat(totaisBanco.totaldespesa) - totalDespesaFrontend
    );

    console.log(`   ┌─ RECEITA`);
    console.log(`   │  Backend (SQL):   R$ ${parseFloat(totaisBanco.totalreceita).toFixed(2)}`);
    console.log(`   │  Frontend (JS):   R$ ${totalReceitaFrontend.toFixed(2)}`);
    console.log(`   │  Diferença:       R$ ${diffReceita.toFixed(2)} ${diffReceita === 0 ? '✅' : '❌'}`);

    console.log(`   │`);
    console.log(`   ├─ DESPESA`);
    console.log(`   │  Backend (SQL):   R$ ${parseFloat(totaisBanco.totaldespesa).toFixed(2)}`);
    console.log(`   │  Frontend (JS):   R$ ${totalDespesaFrontend.toFixed(2)}`);
    console.log(`   │  Diferença:       R$ ${diffDespesa.toFixed(2)} ${diffDespesa === 0 ? '✅' : '❌'}`);

    console.log(`   │`);
    console.log(`   └─ LÍQUIDO`);
    const totalLiquidoFrontend = totalReceitaFrontend - totalDespesaFrontend;
    const diffLiquido = Math.abs(
      parseFloat(totaisBanco.totalliquido) - totalLiquidoFrontend
    );
    console.log(`      Backend (SQL):   R$ ${parseFloat(totaisBanco.totalliquido).toFixed(2)}`);
    console.log(`      Frontend (JS):   R$ ${totalLiquidoFrontend.toFixed(2)}`);
    console.log(`      Diferença:       R$ ${diffLiquido.toFixed(2)} ${diffLiquido === 0 ? '✅' : '❌'}`);

    // ==========================================
    // DIAGNÓSTICO FINAL
    // ==========================================
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 DIAGNÓSTICO');
    console.log('═'.repeat(80));

    if (diffReceita === 0 && diffDespesa === 0) {
      console.log('✅ NÃO HÁ DISCREPÂNCIA NESTE PERÍODO!');
      console.log('\nPossibilidades:');
      console.log('  1. O problema foi corrigido');
      console.log('  2. O período anterior tinha discrepância, este não tem');
      console.log('  3. Usar outro período ou datas específicas');
    } else if (diffReceita === 0 && diffDespesa > 0) {
      console.log('⚠️  DISCREPÂNCIA APENAS EM DESPESAS');
      console.log(`    Diferença: R$ ${diffDespesa.toFixed(2)}`);
      console.log('\nProváveis causas:');
      console.log('  • Despesas com valores muito pequenos (problemas de precisão)');
      console.log('  • Despesas com status diferente');
      console.log('  • Alguma despesa sendo alocada diferentemente');
      console.log(`\nAção: Verificar despesas detalhadas acima`);
    } else if (diffReceita > 0) {
      console.log('⚠️  DISCREPÂNCIA TAMBÉM EM RECEITAS');
      console.log(`    Receita: R$ ${diffReceita.toFixed(2)}`);
      console.log(`    Despesa: R$ ${diffDespesa.toFixed(2)}`);
      console.log('\nProváveis causas:');
      console.log('  • Registros sendo inseridos simultaneamente');
      console.log('  • Diferença de timezone');
      console.log('  • Carregamento de dados não sincronizado');
    }

    console.log('\n' + '═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// ==========================================
// MAIN
// ==========================================

const args = process.argv.slice(2);
let dataInicio = '2026-05-01';
let dataFim = '2026-05-08';

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--from' && args[i + 1]) {
    dataInicio = args[i + 1];
  } else if (args[i] === '--to' && args[i + 1]) {
    dataFim = args[i + 1];
  }
}

console.log('\n🔍 Iniciando diagnóstico...\n');
runDiagnostics(dataInicio, dataFim);
