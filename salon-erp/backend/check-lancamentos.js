const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    console.log('Conectando ao banco...');
    const result = await pool.query('SELECT COUNT(*) as cnt FROM faturamento');
    console.log(`Total de lançamentos: ${result.rows[0].cnt}`);
    
    const aprilResult = await pool.query(`
      SELECT id, data, total, categoria, tipo
      FROM faturamento 
      WHERE EXTRACT(YEAR FROM data) = 2026 AND EXTRACT(MONTH FROM data) = 4
      ORDER BY data DESC
      LIMIT 20
    `);
    
    console.log(`\nLançamentos em abril/2026: ${aprilResult.rows.length}`);
    aprilResult.rows.forEach(r => {
      console.log(`  - ${r.data} | R$ ${r.total} | ${r.tipo} | ${r.categoria}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('ERRO:', err.message);
    console.error(err);
  }
}

check();
