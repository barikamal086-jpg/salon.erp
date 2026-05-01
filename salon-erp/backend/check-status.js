const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:lqyUrQLrqStykmMiGBsQPDVYPrbhwsZs@postgres.railway.internal:5432/railway'
});

(async () => {
  try {
    const result = await pool.query('SELECT DISTINCT status FROM notas_fiscais ORDER BY status;');
    console.log(JSON.stringify(result.rows, null, 2));
    await pool.end();
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
})();
