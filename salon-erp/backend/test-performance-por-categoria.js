/**
 * Teste específico para "Performance por Categoria"
 * Execute após redeploy para verificar se está funcionando
 */

const Faturamento = require('./models/Faturamento');
require('dotenv').config();
require('./database');

async function testPerformanceCategoria() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     TESTE: Performance por Categoria                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const from = '2026-04-01';
    const to = '2026-04-30';

    console.log(`📊 Testando período: ${from} a ${to}\n`);

    // 1. Obter stats por categoria
    console.log('1️⃣  Obtendo stats por categoria...\n');
    const statsPorCategoria = await Faturamento.obterStatsPorCategoria(from, to);

    if (!statsPorCategoria || statsPorCategoria.length === 0) {
      console.log('❌ ERRO: Nenhum dado retornado!\n');
      process.exit(1);
    }

    console.log(`✅ Encontrados ${statsPorCategoria.length} categorias:\n`);

    // Mostrar dados de cada categoria
    statsPorCategoria.forEach((cat, i) => {
      // Acessar com fallback para lowercase
      const receita = parseFloat(cat.totalreceita || cat.totalReceita || 0);
      const despesa = parseFloat(cat.totaldespesa || cat.totalDespesa || 0);
      const liquido = parseFloat(cat.totalliquido || cat.totalLiquido || 0);

      console.log(`   ${i+1}. ${cat.categoria.padEnd(10)}`);
      console.log(`      Receita: R$ ${receita.toFixed(2)}`);
      console.log(`      Despesa: R$ ${despesa.toFixed(2)}`);
      console.log(`      Líquido: R$ ${liquido.toFixed(2)}`);
      console.log(`      Dias: ${cat.dias || 0}`);
      console.log();
    });

    // 2. Obter despesas alocadas
    console.log('2️⃣  Obtendo despesas alocadas...\n');
    const despesasAlocadas = await Faturamento.obterDespesasAlocadas(from, to);

    if (!despesasAlocadas || despesasAlocadas.length === 0) {
      console.log('⚠️  Nenhuma despesa alocada (esperado se Salão for único com despesas)\n');
    } else {
      console.log(`✅ Despesas alocadas para ${despesasAlocadas.length} categorias:\n`);

      despesasAlocadas.forEach((desp, i) => {
        console.log(`   ${i+1}. ${desp.categoria.padEnd(10)}`);
        console.log(`      Taxas Reais: R$ ${(desp.totalTaxas || 0).toFixed(2)}`);
        console.log(`      Despesas Alocadas: R$ ${(desp.totalDespesasAlocadas || 0).toFixed(2)}`);
        console.log(`      Total Despesa: R$ ${(desp.totalDespesa || 0).toFixed(2)}`);
        console.log(`      Líquido: R$ ${(desp.totalLiquido || 0).toFixed(2)}`);
        console.log();
      });
    }

    // 3. Simular merge (como o frontend faz)
    console.log('3️⃣  Simulando merge (como o frontend faz)...\n');

    const despesasMap = {};
    (despesasAlocadas || []).forEach(d => {
      despesasMap[d.categoria] = d;
    });

    const dadosMerged = statsPorCategoria.map(stat => {
      const desp = despesasMap[stat.categoria];
      if (desp) {
        return {
          ...stat,
          totalTaxas: desp.totalTaxas || 0,
          totalDespesasAlocadas: desp.totalDespesasAlocadas || 0,
          totalDespesa: desp.totalDespesa,
          totalLiquido: desp.totalLiquido
        };
      }
      return stat;
    });

    console.log(`✅ Dados mergeados para frontend:\n`);
    dadosMerged.forEach((cat, i) => {
      const receita = parseFloat(cat.totalreceita || cat.totalReceita || 0);
      const taxa = cat.totalTaxas || 0;
      const despesasAloc = cat.totalDespesasAlocadas || 0;
      const liquido = cat.totalLiquido || 0;

      console.log(`   ${i+1}. ${cat.categoria}`);
      console.log(`      Receita: R$ ${receita.toFixed(2)}`);
      console.log(`      Taxas: R$ ${taxa.toFixed(2)}`);
      console.log(`      Despesas Alocadas: R$ ${despesasAloc.toFixed(2)}`);
      console.log(`      Líquido: R$ ${liquido.toFixed(2)}`);
      console.log();
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            ✅ TESTE CONCLUÍDO COM SUCESSO!                ║');
    console.log('║    Performance por Categoria deve aparecer no dashboard   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error('\nStack:', err.stack);
    process.exit(1);
  }
}

// Aguardar inicialização do banco
setTimeout(testPerformanceCategoria, 2000);
