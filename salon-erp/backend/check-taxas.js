const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://postgres:lqyUrQLrqStykmMiGBsQPDVYPrbhwsZs@postgres.railway.internal:5432/railway'
});

async function checkTaxas() {
  const client = await pool.connect();
  try {
    console.log('🔍 VERIFICANDO ESTRUTURA DE TAXAS NO FATURAMENTO\n');

    // 1. Ver alguns registros de iFood, Keeta, 99Food
    console.log('📊 PRIMEIROS REGISTROS (últimos 10):');
    const result1 = await client.query(`
      SELECT 
        id, data, total, categoria, tipo, tipo_despesa_id, status
      FROM faturamento
      WHERE categoria IN ('iFood', 'Keeta', '99Food')
      ORDER BY data DESC
      LIMIT 10
    `);
    console.table(result1.rows);

    // 2. Ver quantos registros por categoria
    console.log('\n📈 CONTAGEM POR CATEGORIA:');
    const result2 = await client.query(`
      SELECT categoria, COUNT(*) as quantidade, SUM(total) as total_valor
      FROM faturamento
      WHERE categoria IN ('iFood', 'Keeta', '99Food')
      GROUP BY categoria
      ORDER BY categoria
    `);
    console.table(result2.rows);

    // 3. Ver valores únicos de 'tipo'
    console.log('\n🏷️ VALORES DE "tipo":');
    const result3 = await client.query(`
      SELECT DISTINCT tipo, COUNT(*) as quantidade
      FROM faturamento
      WHERE categoria IN ('iFood', 'Keeta', '99Food')
      GROUP BY tipo
    `);
    console.table(result3.rows);

    pool.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    pool.end();
  }
}

checkTaxas();
