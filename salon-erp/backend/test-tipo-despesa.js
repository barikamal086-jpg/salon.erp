/**
 * Teste do método TipoDespesa.obterPorClassificacao()
 * Execute com: node test-tipo-despesa.js
 */

const TipoDespesa = require('./models/TipoDespesa');
require('dotenv').config();
require('./database');

async function testarTipoDespesa() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          TESTE: TipoDespesa.obterPorClassificacao()        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Testar obterTodos()
    console.log('1️⃣  Testando obterTodos()...\n');
    const todos = await TipoDespesa.obterTodos();
    console.log(`   ✅ Retornou: ${todos.length} registros\n`);

    if (todos.length > 0) {
      console.log('   Primeiros 3 registros:');
      todos.slice(0, 3).forEach((t, i) => {
        console.log(`   ${i+1}. ID: ${t.id}, Classificação: ${t.classificacao}, Subcategoria: ${t.subcategoria}`);
      });
      console.log();
    } else {
      console.log('   ⚠️  NENHUM REGISTRO ENCONTRADO!\n');
    }

    // 2. Testar obterPorClassificacao()
    console.log('2️⃣  Testando obterPorClassificacao()...\n');
    const agrupado = await TipoDespesa.obterPorClassificacao();

    const keys = Object.keys(agrupado);
    console.log(`   ✅ Retornou: ${keys.length} classificações\n`);

    console.log('   Classificações:');
    keys.forEach(key => {
      console.log(`   - ${key}: ${agrupado[key].length} subcategorias`);
      agrupado[key].forEach(sub => {
        console.log(`     • ${sub.subcategoria}`);
      });
    });
    console.log();

    // 3. Testar obterCMV()
    console.log('3️⃣  Testando obterCMV()...\n');
    const cmv = await TipoDespesa.obterCMV();
    console.log(`   ✅ Retornou: ${cmv.length} registros de CMV\n`);

    if (cmv.length > 0) {
      cmv.forEach((c, i) => {
        console.log(`   ${i+1}. ${c.subcategoria}`);
      });
    } else {
      console.log('   ⚠️  NENHUM CMV ENCONTRADO!\n');
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    DIAGNÓSTICO COMPLETO                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (todos.length === 0) {
      console.log('❌ PROBLEMA: Nenhum tipo_despesa encontrado no banco!');
      console.log('\n   Causas possíveis:');
      console.log('   1. Tabela tipo_despesa está vazia');
      console.log('   2. Todos os registros têm ativa = 0');
      console.log('   3. Tabela não foi criada');
    } else {
      console.log('✅ Dados de tipo_despesa estão OK');
      console.log(`✅ ${keys.length} classificações encontradas`);
    }
    console.log();

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

testarTipoDespesa();
