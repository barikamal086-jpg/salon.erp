/**
 * Script para verificar dados migrados no PostgreSQL
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyMigration() {
  try {
    console.log('\n🔍 Verificando dados no PostgreSQL...\n');

    // Contar registros por categoria
    const result = await pool.query(`
      SELECT
        categoria,
        COUNT(*) as total,
        ROUND(SUM(CAST(total AS NUMERIC)), 2) as receita_total
      FROM faturamento
      WHERE tipo = 'receita'
      GROUP BY categoria
      ORDER BY receita_total DESC
    `);

    console.log('📊 Receitas por Categoria:');
    let totalGeral = 0;
    for (const row of result.rows) {
      const valor = parseFloat(row.receita_total || 0);
      totalGeral += valor;
      console.log(`   ${row.categoria}: R$ ${valor.toFixed(2)} (${row.total} registros)`);
    }
    console.log(`\n   TOTAL GERAL: R$ ${totalGeral.toFixed(2)}\n`);

    // Verificar registros mais recentes
    const latest = await pool.query(`
      SELECT data, categoria, tipo, CAST(total AS NUMERIC) as total
      FROM faturamento
      WHERE tipo = 'receita'
      ORDER BY data DESC
      LIMIT 5
    `);

    console.log('📅 Últimos 5 registros:');
    for (const row of latest.rows) {
      console.log(`   ${row.data} | ${row.categoria.padEnd(8)} | R$ ${parseFloat(row.total).toFixed(2)}`);
    }

    // Verificar contagem total
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM faturamento) as faturamentos,
        (SELECT COUNT(*) FROM tipo_despesa) as tipos_despesa,
        (SELECT COUNT(*) FROM restaurantes) as restaurantes,
        (SELECT COUNT(*) FROM notas_fiscais) as notas_fiscais
    `);

    const c = counts.rows[0];
    console.log(`\n📈 Totais no PostgreSQL:`);
    console.log(`   Faturamentos:   ${c.faturamentos}`);
    console.log(`   Tipos despesa:  ${c.tipos_despesa}`);
    console.log(`   Restaurantes:   ${c.restaurantes}`);
    console.log(`   Notas fiscais:  ${c.notas_fiscais}\n`);

    console.log('✅ Verificação concluída com sucesso!\n');

    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

verifyMigration();
