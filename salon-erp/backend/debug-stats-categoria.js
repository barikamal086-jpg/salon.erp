/**
 * Debug script para testar obterStatsPorCategoria
 * Execute com: node debug-stats-categoria.js
 */

const Faturamento = require('./models/Faturamento');
require('dotenv').config();
require('./database');

async function debugStatsCategoria() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       DEBUG: Performance por Categoria                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const from = '2026-04-01';
    const to = '2026-04-30';

    console.log(`📊 Testando período: ${from} a ${to}\n`);

    // 1. Testar obterStatsPorCategoria
    console.log('1️⃣  Chamando Faturamento.obterStatsPorCategoria...\n');
    const stats = await Faturamento.obterStatsPorCategoria(from, to);

    if (!stats || stats.length === 0) {
      console.log('❌ ERRO: Nenhum dado retornado!\n');
      console.log('   Verifique:');
      console.log('   1. Se há dados no período 2026-04-01 a 2026-04-30');
      console.log('   2. Se as categorias são: Salão, iFood, Keeta, 99Food');
    } else {
      console.log(`✅ ${stats.length} linhas retornadas!\n`);
      console.log('Dados retornados:\n');
      stats.forEach((s, i) => {
        console.log(`${i+1}. ${s.categoria || 'SEM CATEGORIA'}`);
        console.log(`   Keys: ${Object.keys(s).join(', ')}`);
        console.log(`   totalReceita: ${s.totalReceita || s.totalreceita} (type: ${typeof(s.totalReceita || s.totalreceita)})`);
        console.log(`   totalDespesa: ${s.totalDespesa || s.totaldespesa}`);
        console.log(`   dias: ${s.dias}`);
        console.log();
      });
    }

    // 2. Testar obterDespesasAlocadas
    console.log('\n2️⃣  Chamando Faturamento.obterDespesasAlocadas...\n');
    const despesas = await Faturamento.obterDespesasAlocadas(from, to);

    if (!despesas || despesas.length === 0) {
      console.log('❌ ERRO: Nenhuma despesa retornada!\n');
    } else {
      console.log(`✅ ${despesas.length} linhas retornadas!\n`);
      console.log('Dados de despesas:\n');
      despesas.forEach((d, i) => {
        console.log(`${i+1}. ${d.categoria}`);
        console.log(`   totalReceita: ${d.totalReceita}`);
        console.log(`   totalTaxas: ${d.totalTaxas}`);
        console.log(`   totalDespesasAlocadas: ${d.totalDespesasAlocadas}`);
        console.log(`   totalDespesa: ${d.totalDespesa}`);
        console.log(`   totalLiquido: ${d.totalLiquido}`);
        console.log();
      });
    }

    // 3. Testar merge como o frontend faz
    if (stats && stats.length > 0 && despesas && despesas.length > 0) {
      console.log('\n3️⃣  Simulando merge no frontend...\n');

      const despesasMap = {};
      despesas.forEach(d => {
        despesasMap[d.categoria] = d;
      });

      const merged = stats.map(s => {
        const desp = despesasMap[s.categoria];
        return {
          categoria: s.categoria,
          totalReceita: parseFloat(s.totalreceita || s.totalReceita || 0),
          totalDespesa: desp ? desp.totalDespesa : parseFloat(s.totaldespesa || s.totalDespesa || 0),
          totalLiquido: desp ? desp.totalLiquido : parseFloat(s.totalliquido || s.totalLiquido || 0),
          dias: parseInt(s.dias || 0),
          mediaReceita: parseFloat(s.mediareceita || s.mediaReceita || 0),
        };
      });

      console.log('✅ Dados mergeados:\n');
      merged.forEach((m, i) => {
        console.log(`${i+1}. ${m.categoria}`);
        console.log(`   Receita: R$ ${m.totalReceita.toFixed(2)}`);
        console.log(`   Despesa: R$ ${m.totalDespesa.toFixed(2)}`);
        console.log(`   Líquido: R$ ${m.totalLiquido.toFixed(2)}`);
        console.log();
      });
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    DEBUG CONCLUÍDO                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

// Aguardar inicialização do banco
setTimeout(debugStatsCategoria, 2000);
