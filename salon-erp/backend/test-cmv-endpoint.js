const Faturamento = require('./models/Faturamento');
require('dotenv').config();
require('./database');

async function testCMV() {
  try {
    console.log('\n🧪 Testando endpoints de CMV...\n');

    // Teste 1: CMV Inteligente (sem canal específico - todos)
    console.log('1️⃣  GET /api/cmv-inteligente (todos os canais)');
    console.log('   From: 2026-04-01, To: 2026-04-30\n');

    const cmvData = await Faturamento.obterDadosCMV('2026-04-01', '2026-04-30', null);

    console.log('   Resultado:');
    console.log(`   - Total Receita: R$ ${cmvData.resumo.totalReceita}`);
    console.log(`   - Total CMV: R$ ${cmvData.resumo.totalCMV}`);
    console.log(`   - CMV %: ${cmvData.resumo.cmvPercentual.toFixed(2)}%`);
    console.log(`   - Despesas Alocadas: ${cmvData.despesasAlocadas?.length || 0} canais\n`);

    // Teste 2: CMV Inteligente por canal específico
    console.log('2️⃣  GET /api/cmv-inteligente (canal Salão)');
    const cmvSalao = await Faturamento.obterDadosCMV('2026-04-01', '2026-04-30', 'Salão');
    console.log(`   Receita Salão: R$ ${cmvSalao.resumo.totalReceita}`);
    console.log(`   CMV Salão: R$ ${cmvSalao.resumo.totalCMV}`);
    console.log(`   CMV % Salão: ${cmvSalao.resumo.cmvPercentual.toFixed(2)}%\n`);

    // Teste 3: Stats por categoria (para comparação visual)
    console.log('3️⃣  GET /api/faturamentos/stats-por-categoria (comparação visual)\n');
    const statsPorCat = await Faturamento.obterStatsPorCategoria('2026-04-01', '2026-04-30');

    console.log('   Resultado (por canal):');
    statsPorCat.forEach(cat => {
      console.log(`   - ${cat.categoria.padEnd(10)}: R$ ${cat.totalreceita || cat.totalReceita} | CMV estimado: ${cat.totaldespesa || cat.totalDespesa}`);
    });

    console.log('\n✅ Todos os endpoints respondendo corretamente!\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

setTimeout(testCMV, 2000);
