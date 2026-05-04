const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    console.log('🔍 Verificando duplicatas de 01/04/2026...\n');

    // Query 1: Procurar registros exatos
    const result1 = await pool.query(`
      SELECT id, data, total, categoria, tipo, created_at
      FROM faturamento 
      WHERE DATE(data) = '2026-04-01' 
        AND total = 3609.70 
        AND categoria = 'Salão'
      ORDER BY created_at DESC
    `);

    console.log(`📊 QUERY 1: Registros com data=01/04/2026, valor=3609.70, categoria=Salão`);
    console.log(`Total encontrado: ${result1.rows.length}\n`);
    
    if (result1.rows.length > 0) {
      result1.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ID: ${row.id}`);
        console.log(`   Data: ${row.data} | Valor: R$ ${row.total} | Tipo: ${row.tipo}`);
        console.log(`   Criado: ${row.created_at}\n`);
      });
    }

    // Query 2: Todos os lançamentos de 01/04/2026
    const result2 = await pool.query(`
      SELECT id, data, total, categoria, tipo, created_at
      FROM faturamento 
      WHERE DATE(data) = '2026-04-01'
      ORDER BY total DESC, created_at DESC
    `);

    console.log(`\n📊 QUERY 2: TODOS os lançamentos de 01/04/2026`);
    console.log(`Total encontrado: ${result2.rows.length}\n`);
    
    if (result2.rows.length > 0) {
      result2.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ID: ${row.id} | R$ ${row.total} | ${row.categoria} | ${row.tipo}`);
      });
    }

    // Query 3: Procurar por padrão de duplicação (mesma data, próximos 5 minutos)
    const result3 = await pool.query(`
      SELECT 
        id, 
        data, 
        total, 
        categoria, 
        tipo,
        EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) as seconds_from_prev
      FROM faturamento 
      WHERE DATE(data) = '2026-04-01'
      ORDER BY created_at DESC
    `);

    console.log(`\n📊 QUERY 3: Timeline de criação (para detectar duplicação automática)`);
    result3.rows.forEach((row, idx) => {
      const gap = row.seconds_from_prev ? `(${Math.round(row.seconds_from_prev)}s depois anterior)` : '(primeiro)';
      console.log(`${idx + 1}. ID: ${row.id} | R$ ${row.total} ${gap}`);
    });

    // Query 4: Estatísticas gerais
    const result4 = await pool.query(`
      SELECT 
        COUNT(*) as total_lancamentos,
        COUNT(DISTINCT id) as ids_unicos,
        COUNT(*) - COUNT(DISTINCT id) as duplicados_detectados
      FROM faturamento
    `);

    console.log(`\n\n📈 ESTATÍSTICAS GERAIS:`);
    console.log(`   Total de lançamentos: ${result4.rows[0].total_lancamentos}`);
    console.log(`   IDs únicos: ${result4.rows[0].ids_unicos}`);
    console.log(`   Duplicados: ${result4.rows[0].duplicados_detectados}`);

    if (result4.rows[0].duplicados_detectados > 0) {
      console.log(`\n❌ PROBLEMA: Há ${result4.rows[0].duplicados_detectados} registros duplicados no banco!`);
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️  Não consegui conectar ao banco PostgreSQL do Railway.');
      console.log('   Vou criar um script curl para você usar manualmente.');
    }
    process.exit(1);
  }
}

check();
