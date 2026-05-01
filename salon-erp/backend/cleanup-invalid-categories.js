/**
 * Remover registros com categorias inválidas (mantém apenas 4 canais corretos)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function limparCategoriasInvalidas() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        REMOVENDO CATEGORIAS INVÁLIDAS                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const categoriasValidas = ['Salão', 'iFood', 'Keeta', '99Food'];

    // 1. Contar registros ANTES
    const beforeResult = await pool.query('SELECT COUNT(*) as total FROM faturamento');
    const totalAntes = beforeResult.rows[0].total;
    console.log(`📊 Total ANTES: ${totalAntes} registros\n`);

    // 2. Mostrar categorias a remover
    const invalidResult = await pool.query(`
      SELECT categoria, COUNT(*) as total
      FROM faturamento
      WHERE categoria NOT IN ('Salão', 'iFood', 'Keeta', '99Food')
      GROUP BY categoria
      ORDER BY total DESC
    `);

    console.log(`🗑️  Categorias a remover (${invalidResult.rows.length}):\n`);
    let totalInvalidos = 0;
    invalidResult.rows.forEach(row => {
      totalInvalidos += row.total;
      console.log(`   - ${row.categoria}: ${row.total} registros`);
    });
    console.log(`\n   Total a deletar: ${totalInvalidos} registros\n`);

    // 3. Deletar notas_fiscais dos registros inválidos
    console.log('🗑️  Deletando notas_fiscais associadas...');
    const deleteNFRes = await pool.query(`
      DELETE FROM notas_fiscais
      WHERE faturamento_id IN (
        SELECT id FROM faturamento
        WHERE categoria NOT IN ('Salão', 'iFood', 'Keeta', '99Food')
      )
    `);
    console.log(`   ✅ ${deleteNFRes.rowCount} notas_fiscais deletadas`);

    // 4. Deletar faturamentos inválidos
    console.log('\n🗑️  Deletando faturamentos com categorias inválidas...');
    const deleteFatRes = await pool.query(`
      DELETE FROM faturamento
      WHERE categoria NOT IN ('Salão', 'iFood', 'Keeta', '99Food')
    `);
    console.log(`   ✅ ${deleteFatRes.rowCount} faturamentos deletados`);

    // 5. Contar DEPOIS
    const afterResult = await pool.query('SELECT COUNT(*) as total FROM faturamento');
    const totalDepois = afterResult.rows[0].total;
    console.log(`\n📊 Total DEPOIS: ${totalDepois} registros`);
    console.log(`   Removidos: ${totalAntes - totalDepois}`);

    // 6. Mostrar novo resumo
    console.log('\n💰 RECEITAS POR CATEGORIA (após limpeza):\n');
    const cleanResult = await pool.query(`
      SELECT
        categoria,
        COUNT(*) as total,
        CAST(SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END) AS DECIMAL(10,2)) as receita,
        CAST(SUM(CASE WHEN tipo='despesa' THEN total ELSE 0 END) AS DECIMAL(10,2)) as despesa
      FROM faturamento
      GROUP BY categoria
      ORDER BY receita DESC
    `);

    let totalReceitaGeral = 0;
    cleanResult.rows.forEach(row => {
      const receita = parseFloat(row.receita || 0);
      totalReceitaGeral += receita;
      console.log(`   ${row.categoria.padEnd(10)} | Receita: R$ ${receita.toFixed(2).padStart(12)} | Despesa: R$ ${parseFloat(row.despesa || 0).toFixed(2).padStart(12)} | ${row.total} regs`);
    });
    console.log(`   ${'-'.repeat(70)}`);
    console.log(`   TOTAL      | Receita: R$ ${totalReceitaGeral.toFixed(2).padStart(12)}`);

    console.log('\n✅ Banco limpo com sucesso!\n');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

limparCategoriasInvalidas();
