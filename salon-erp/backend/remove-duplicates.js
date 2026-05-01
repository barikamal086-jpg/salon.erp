/**
 * Script para remover registros duplicados mantendo apenas 1 cópia de cada
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function removerDuplicatas() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          REMOVENDO REGISTROS DUPLICADOS                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Contar duplicatas ANTES
    const beforeResult = await pool.query('SELECT COUNT(*) as total FROM faturamento');
    const totalAntes = beforeResult.rows[0].total;
    console.log(`📊 Total ANTES: ${totalAntes} registros`);

    // 2. Identificar IDs a manter (o mais antigo de cada grupo de duplicatas)
    console.log('\n🔍 Identificando registros a manter...');

    const keepResult = await pool.query(`
      SELECT MIN(id) as id_manter
      FROM faturamento
      GROUP BY data, categoria, total
      HAVING COUNT(*) > 1
    `);

    console.log(`   Encontrados ${keepResult.rows.length} grupos de duplicatas`);

    // 3. Listar os IDs a DELETAR
    const deleteResult = await pool.query(`
      WITH duplicatas AS (
        SELECT
          id,
          ROW_NUMBER() OVER (PARTITION BY data, categoria, total ORDER BY id) as rn,
          COUNT(*) OVER (PARTITION BY data, categoria, total) as count
        FROM faturamento
      )
      SELECT id
      FROM duplicatas
      WHERE rn > 1
    `);

    const idsToDelete = deleteResult.rows.map(r => r.id);
    console.log(`   IDs a deletar: ${idsToDelete.length}`);
    console.log(`   IDs: ${idsToDelete.slice(0, 10).join(', ')}${idsToDelete.length > 10 ? '...' : ''}`);

    // 4a. PRIMEIRO, deletar notas_fiscais que referenciam duplicatas
    console.log('\n🗑️  Primeiro, deletando notas_fiscais dos registros duplicados...');
    const deleteNFRes = await pool.query(`
      DELETE FROM notas_fiscais
      WHERE faturamento_id IN (
        WITH duplicatas AS (
          SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY data, categoria, total ORDER BY id) as rn
          FROM faturamento
        )
        SELECT id
        FROM duplicatas
        WHERE rn > 1
      )
    `);

    console.log(`   ✅ ${deleteNFRes.rowCount} notas_fiscais deletadas`);

    // 4b. DEPOIS, deletar duplicatas de faturamento
    console.log('\n🗑️  Agora, deletando registros duplicados de faturamento...');
    const deleteRes = await pool.query(`
      DELETE FROM faturamento
      WHERE id IN (
        WITH duplicatas AS (
          SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY data, categoria, total ORDER BY id) as rn
          FROM faturamento
        )
        SELECT id
        FROM duplicatas
        WHERE rn > 1
      )
    `);

    console.log(`   ✅ ${deleteRes.rowCount} registros deletados`);

    // 5. Contar DEPOIS
    const afterResult = await pool.query('SELECT COUNT(*) as total FROM faturamento');
    const totalDepois = afterResult.rows[0].total;
    console.log(`\n📊 Total DEPOIS: ${totalDepois} registros`);
    console.log(`   Removidos: ${totalAntes - totalDepois}`);

    // 6. Verificar se ainda há duplicatas
    const checkResult = await pool.query(`
      SELECT COUNT(*) as duplicatas
      FROM (
        SELECT data, categoria, total, COUNT(*) as cnt
        FROM faturamento
        GROUP BY data, categoria, total
        HAVING COUNT(*) > 1
      ) sub
    `);

    const duplicatasRestantes = checkResult.rows[0].duplicatas;
    console.log(`\n✅ Duplicatas restantes: ${duplicatasRestantes}`);

    if (duplicatasRestantes === 0) {
      console.log('   ✨ Banco limpo com sucesso!\n');
      return { sucesso: true, removidos: totalAntes - totalDepois, total: totalDepois };
    } else {
      console.log('   ⚠️  Ainda há duplicatas\n');
      return { sucesso: false, removidos: totalAntes - totalDepois, total: totalDepois, duplicatasRestantes };
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    return { sucesso: false, erro: err.message };
  } finally {
    await pool.end();
  }
}

removerDuplicatas().then(result => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                     OPERAÇÃO CONCLUÍDA                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  process.exit(result.sucesso ? 0 : 1);
});
