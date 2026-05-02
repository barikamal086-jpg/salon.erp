const { pool } = require('./database');

async function analisarDespesas() {
  try {
    console.log('\n📊 ANÁLISE DE DESPESAS EXISTENTES\n');
    console.log('=' .repeat(80));

    // 1. Total de faturamentos
    const totalResult = await pool.query('SELECT COUNT(*) as cnt FROM faturamento');
    const total = parseInt(totalResult.rows[0].cnt);
    console.log(`\n📋 Total de lançamentos: ${total}`);

    // 2. Separar por tipo
    const porTipoResult = await pool.query(
      `SELECT tipo, COUNT(*) as cnt, SUM(total) as total 
       FROM faturamento 
       GROUP BY tipo 
       ORDER BY tipo`
    );
    console.log('\n📈 Por tipo:');
    porTipoResult.rows.forEach(row => {
      console.log(`   ${row.tipo.toUpperCase().padEnd(10)}: ${row.cnt} lançamentos = R$ ${parseFloat(row.total).toFixed(2)}`);
    });

    // 3. Apenas DESPESAS
    const despesasResult = await pool.query(
      `SELECT id, data, total, categoria, tipo_despesa_id, status, created_at
       FROM faturamento 
       WHERE tipo = 'despesa'
       ORDER BY created_at DESC`
    );
    const despesas = despesasResult.rows;
    console.log(`\n🔴 DESPESAS (${despesas.length} lançamentos):`);
    console.log('-'.repeat(80));

    let totalDespesas = 0;
    let semData = 0;
    let comData = 0;

    despesas.forEach((d, i) => {
      const data = d.data || 'SEM DATA';
      const status = d.status ? 'ENVIADO' : 'PENDENTE';
      totalDespesas += parseFloat(d.total || 0);
      
      if (!d.data) semData++;
      else comData++;

      console.log(`${(i+1).toString().padEnd(3)} | Data: ${String(data).padEnd(12)} | R$ ${parseFloat(d.total).toFixed(2).padEnd(12)} | ${d.categoria.padEnd(10)} | ${status}`);
    });

    console.log('-'.repeat(80));
    console.log(`\n📊 Resumo de Despesas:`);
    console.log(`   Total de despesas: ${despesas.length}`);
    console.log(`   Valor total: R$ ${totalDespesas.toFixed(2)}`);
    console.log(`   Com data válida: ${comData}`);
    console.log(`   SEM data (Invalid Date): ${semData}`);

    // 4. Despesas por categoria
    const porCategoriaResult = await pool.query(
      `SELECT categoria, COUNT(*) as cnt, SUM(total) as total
       FROM faturamento 
       WHERE tipo = 'despesa'
       GROUP BY categoria
       ORDER BY total DESC`
    );
    console.log(`\n💰 Despesas por categoria:`);
    porCategoriaResult.rows.forEach(row => {
      console.log(`   ${row.categoria.padEnd(15)}: ${row.cnt} lançamentos = R$ ${parseFloat(row.total).toFixed(2)}`);
    });

    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

analisarDespesas();
