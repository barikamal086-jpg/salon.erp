/**
 * Script para corrigir taxa de Keeta no banco de dados
 *
 * Problema: Valor armazenado como 3631520 em vez de 3631.52
 * Solução: Dividir por 100 para restaurar o valor correto
 *
 * Uso: node fix_keeta_taxa.js [ID do registro]
 * Exemplo: node fix_keeta_taxa.js 703
 */

const { pool } = require('./backend/database');

async function fixKeetaTaxa(recordId = 703) {
  const client = await pool.connect();
  try {
    console.log(`\n🔧 CORRIGINDO TAXA DE KEETA - ID ${recordId}\n`);

    // 1. Ver valor ANTES
    const antes = await client.query(
      'SELECT id, data, total, categoria, tipo, tipo_despesa_id FROM faturamento WHERE id = $1',
      [recordId]
    );

    if (antes.rows.length === 0) {
      console.error(`❌ Registro ID ${recordId} não encontrado!`);
      return;
    }

    const registro = antes.rows[0];
    console.log('📋 ANTES:');
    console.log(`   ID: ${registro.id}`);
    console.log(`   Data: ${registro.data}`);
    console.log(`   Total: ${registro.total} (ERRADO - muito alto!)`);
    console.log(`   Categoria: ${registro.categoria}`);
    console.log(`   Tipo: ${registro.tipo}`);
    console.log(`   tipo_despesa_id: ${registro.tipo_despesa_id}`);

    // 2. Calcular valor correto
    // Se o valor é 3631520, provavelmente foi digitado como "3631520" quando deveria ser "3631.52"
    // Dividir por 100 restaura o valor correto
    const valorErrado = parseFloat(registro.total);
    const valorCorreto = valorErrado / 100;

    console.log(`\n🧮 CONVERSÃO:`);
    console.log(`   Valor errado: ${valorErrado}`);
    console.log(`   Dividir por 100: ${valorCorreto}`);
    console.log(`   Valor correto esperado: 3631.52`);

    if (Math.abs(valorCorreto - 3631.52) > 0.01) {
      console.error(`\n⚠️  AVISO: O valor corrigido (${valorCorreto}) não corresponde ao esperado (3631.52)`);
      console.error('   Talvez o valor armazenado seja diferente do que se espera.');
      console.log('\n   Deseja continuar mesmo assim? Digite "sim" para confirmar.');
      return;
    }

    // 3. Atualizar para valor correto
    console.log(`\n🔄 ATUALIZANDO para ${valorCorreto}...`);
    const resultado = await client.query(
      'UPDATE faturamento SET total = $1, updated_at = NOW() WHERE id = $2',
      [valorCorreto, recordId]
    );

    console.log(`   ✓ Atualizado ${resultado.rowCount} registro(s)`);

    // 4. Ver valor DEPOIS
    const depois = await client.query(
      'SELECT id, data, total, categoria, tipo, tipo_despesa_id FROM faturamento WHERE id = $1',
      [recordId]
    );

    const registroDepois = depois.rows[0];
    console.log('\n✅ DEPOIS:');
    console.log(`   ID: ${registroDepois.id}`);
    console.log(`   Data: ${registroDepois.data}`);
    console.log(`   Total: ${registroDepois.total} (CORRETO!)`);
    console.log(`   Categoria: ${registroDepois.categoria}`);
    console.log(`   Tipo: ${registroDepois.tipo}`);
    console.log(`   tipo_despesa_id: ${registroDepois.tipo_despesa_id}`);

    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Executar
const id = process.argv[2] ? parseInt(process.argv[2]) : 703;
fixKeetaTaxa(id);
