const { pool } = require('./database');

async function testQueries() {
  try {
    console.log('🔍 Executando queries de teste...\n');
    
    // 1. Total de notas em abril
    const abrilRes = await pool.query(`
      SELECT COUNT(*) as total_notas 
      FROM notas_fiscais 
      WHERE data_emissao BETWEEN '2026-04-01' AND '2026-04-30'
    `);
    
    console.log('📊 QUERY 1: Total de notas em abril (2026-04-01 até 2026-04-30)');
    console.log(`   Resultado: ${abrilRes.rows[0].total_notas} notas\n`);
    
    // 2. Notas por situacao_processamento
    const statusRes = await pool.query(`
      SELECT situacao_processamento, COUNT(*) as total
      FROM notas_fiscais 
      WHERE data_emissao BETWEEN '2026-04-01' AND '2026-04-30'
      GROUP BY situacao_processamento
    `);
    
    console.log('📊 QUERY 2: Notas em abril por situacao_processamento');
    statusRes.rows.forEach(row => {
      console.log(`   ${row.situacao_processamento}: ${row.total}`);
    });
    console.log('');
    
    // 3. Notas por tipo
    const tipoRes = await pool.query(`
      SELECT tipo, COUNT(*) as total
      FROM notas_fiscais 
      WHERE data_emissao BETWEEN '2026-04-01' AND '2026-04-30'
      GROUP BY tipo
    `);
    
    console.log('📊 QUERY 3: Notas em abril por tipo');
    tipoRes.rows.forEach(row => {
      console.log(`   ${row.tipo || 'NULL'}: ${row.total}`);
    });
    console.log('');
    
    // 4. Amostra de notas duplicadas
    const dupRes = await pool.query(`
      SELECT numero_nf, fornecedor_nome, valor_total, tipo, motivo_exclusao
      FROM notas_fiscais 
      WHERE situacao_processamento = 'duplicada'
        AND data_emissao BETWEEN '2026-04-01' AND '2026-04-30'
      LIMIT 3
    `);
    
    console.log('📊 QUERY 4: Amostra de notas duplicadas em abril');
    if (dupRes.rows.length === 0) {
      console.log('   Nenhuma nota duplicada encontrada');
    } else {
      dupRes.rows.forEach(row => {
        console.log(`   ${row.numero_nf} (${row.fornecedor_nome}): ${row.motivo_exclusao}`);
      });
    }
    console.log('');
    
    // 5. Total geral de notas no sistema
    const totalRes = await pool.query(`
      SELECT COUNT(*) as total_geral
      FROM notas_fiscais
    `);
    
    console.log('📊 QUERY 5: Total geral de notas no sistema');
    console.log(`   Total: ${totalRes.rows[0].total_geral} notas\n`);
    
    console.log('✅ Queries executadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao executar queries:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testQueries();
