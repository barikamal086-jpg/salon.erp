/**
 * Test the actual API response format
 */

const Faturamento = require('./models/Faturamento');
require('dotenv').config();
require('./database');

async function testAPIResponse() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        TESTE: Resposta da API do Dashboard                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Simular a chamada do dashboard
    const from = '2026-04-01';
    const to = '2026-04-30';

    console.log(`🧪 Teste 1: Faturamento.obterStats('${from}', '${to}', null)`);
    const stats = await Faturamento.obterStats(from, to, null);
    console.log('\n✅ Resposta da API:\n');
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n🧪 Teste 2: Faturamento.obterStatsPorCategoria(\'${from}\', \'${to}\')');
    const statsPorCategoria = await Faturamento.obterStatsPorCategoria(from, to);
    console.log('\n✅ Resposta da API:\n');
    console.log(JSON.stringify(statsPorCategoria, null, 2));

    console.log('\n🧪 Teste 3: Faturamento.listar(30, null, null)');
    const faturamentos = await Faturamento.listar(30, null, null);
    console.log(`\n✅ Encontrados ${faturamentos.length} faturamentos`);
    if (faturamentos.length > 0) {
      console.log('Primeiros 3:\n');
      console.log(JSON.stringify(faturamentos.slice(0, 3), null, 2));
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        ✅ TESTE DE API CONCLUÍDO COM SUCESSO              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error('\nStack:', err.stack);
    process.exit(1);
  }
}

// Aguardar inicialização do banco
setTimeout(testAPIResponse, 2000);
