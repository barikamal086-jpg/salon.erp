require('dotenv').config();
const { Pool } = require('pg');

console.log('🔌 Tentando conectar ao banco PostgreSQL...\n');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000
});

async function test() {
  try {
    console.log('⏳ Conectando...');
    const connTest = await pool.query('SELECT NOW()');
    console.log('✅ CONECTADO COM SUCESSO!\n');
    
    // Buscar registros de 01/04/2026
    const result = await pool.query(`
      SELECT id, data, total, categoria, tipo, created_at
      FROM faturamento
      WHERE DATE(data) = '2026-04-01'
      ORDER BY created_at DESC
    `);
    
    console.log(`📋 REGISTROS EM 01/04/2026: ${result.rows.length}\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ NENHUM REGISTRO ENCONTRADO EM 01/04/2026');
    } else {
      result.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ID: ${row.id} | R$ ${row.total} | ${row.categoria} | ${row.tipo}`);
        console.log(`   Data no banco: ${row.data}`);
        console.log(`   Criado em: ${row.created_at}\n`);
      });
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ NÃO CONSEGUI CONECTAR AO BANCO');
    console.error(`Erro: ${err.message}\n`);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 COMANDO PARA VOCÊ EXECUTAR NO CONSOLE DO NAVEGADOR:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log(`
fetch('/api/faturamentos?days=365')
  .then(r => r.json())
  .then(d => {
    console.log('\n🔍 PROCURANDO REGISTROS DE 01/04/2026...\n');
    
    const abril = d.data.filter(x => {
      const data = x.data.substring(0, 10);
      return data === '2026-04-01';
    });
    
    console.log('✅ ENCONTRADO: ' + abril.length + ' registros\n');
    
    if (abril.length === 0) {
      console.log('❌ NENHUM REGISTRO DE 01/04/2026 NO BANCO');
    } else {
      abril.forEach((x, i) => {
        console.log((i+1) + '. ID: ' + x.id + ' | R$ ' + x.total + ' | ' + x.categoria + ' | ' + x.tipo);
      });
      
      console.log('\n' + abril.length + ' registros total');
    }
  })
    `);
    
    process.exit(1);
  }
}

test();
