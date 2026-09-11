/**
 * Migração pontual (2026-09-11): Novos Canais
 *
 * 1) Corrige 7 registros com categoria='Salao' (sem acento) -> 'Salão'
 *    (confirmado pelo usuário — bug de edição relatado)
 * 2) Migra histórico: categoria='iFood' -> 'iFood Loja 1'
 *                      categoria='99Food' -> '99Food Loja 1'
 *    (confirmado pelo usuário — "renomear o atual")
 * 3) Corrige espaço em branco em tipo_despesa.subcategoria ('Taxas ' -> 'Taxas')
 *    para o tipo Financeira/Taxas usado pelo novo lançamento por canal.
 *
 * Uso: node scripts/migrate-canais-2026-09-11.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- ANTES ---');
    const antes = await client.query(
      `SELECT categoria, COUNT(*) FROM faturamento WHERE categoria IN ('Salao','iFood','99Food') GROUP BY categoria`
    );
    console.log(antes.rows);

    const fixSalao = await client.query(
      `UPDATE faturamento SET categoria = 'Salão', updated_at = NOW() WHERE categoria = 'Salao'`
    );
    console.log(`✅ 'Salao' -> 'Salão': ${fixSalao.rowCount} linha(s)`);

    const fixIfood = await client.query(
      `UPDATE faturamento SET categoria = 'iFood Loja 1', updated_at = NOW() WHERE categoria = 'iFood'`
    );
    console.log(`✅ 'iFood' -> 'iFood Loja 1': ${fixIfood.rowCount} linha(s)`);

    const fix99Food = await client.query(
      `UPDATE faturamento SET categoria = '99Food Loja 1', updated_at = NOW() WHERE categoria = '99Food'`
    );
    console.log(`✅ '99Food' -> '99Food Loja 1': ${fix99Food.rowCount} linha(s)`);

    const fixTipoDespesa = await client.query(
      `UPDATE tipo_despesa SET subcategoria = 'Taxas' WHERE id = 25 AND subcategoria = 'Taxas '`
    );
    console.log(`✅ tipo_despesa#25 subcategoria 'Taxas ' -> 'Taxas': ${fixTipoDespesa.rowCount} linha(s)`);

    await client.query('COMMIT');

    console.log('\n--- DEPOIS ---');
    const depois = await client.query(
      `SELECT categoria, COUNT(*) FROM faturamento GROUP BY categoria ORDER BY 1`
    );
    console.log(depois.rows);

    const tipoDepois = await client.query(
      `SELECT id, classificacao, subcategoria FROM tipo_despesa WHERE id = 25`
    );
    console.log(tipoDepois.rows);

    console.log('\n✅ Migração concluída com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migração, ROLLBACK aplicado:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
