const { pool } = require('../database');

async function revisarTaxas(plataforma = '99Food', from = '2026-04-01', to = '2026-04-30') {
  const client = await pool.connect();
  try {
    console.log(`\n📊 REVISÃO DE TAXAS - ${plataforma} (${from} a ${to})\n`);

    // Query: Mostrar TODOS os registros
    const query = `
      SELECT
        f.id,
        f.data,
        f.tipo,
        f.categoria,
        f.total,
        td.id as tipo_despesa_id,
        td.subcategoria,
        td.classificacao
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE f.categoria = $1
        AND f.data BETWEEN $2 AND $3
      ORDER BY f.data DESC, td.subcategoria, f.total DESC
    `;

    const result = await client.query(query, [plataforma, from, to]);

    console.log(`✅ Total de registros encontrados: ${result.rows.length}\n`);

    // Separar por tipo
    const receitas = result.rows.filter(r => r.tipo === 'receita' || !r.tipo);
    const taxas = result.rows.filter(r => r.tipo === 'despesa' && r.subcategoria === 'Taxas');
    const despesas = result.rows.filter(r => r.tipo === 'despesa' && r.subcategoria !== 'Taxas');

    const totalReceita = receitas.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    const totalTaxas = taxas.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    const totalDespesas = despesas.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    const percentualTaxas = totalReceita > 0 ? ((totalTaxas / totalReceita) * 100).toFixed(2) : 0;

    // ==================== RESUMO ====================
    console.log('📋 RESUMO:');
    console.log(`   Receitas:     R$ ${totalReceita.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   Taxas:        R$ ${totalTaxas.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentualTaxas}%)`);
    console.log(`   Despesas:     R$ ${totalDespesas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    console.log(`   Líquido:      R$ ${(totalReceita - totalTaxas - totalDespesas).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

    // ==================== RECEITAS ====================
    console.log(`\n💰 RECEITAS (${receitas.length}):`);
    receitas.forEach(r => {
      console.log(`   ${r.data} | R$ ${parseFloat(r.total).toLocaleString('pt-BR', {minimumFractionDigits: 2})} | ${r.subcategoria || 'N/A'}`);
    });

    // ==================== TAXAS ====================
    console.log(`\n⚠️  TAXAS (${taxas.length}) - REVISE SE ESTÃO CORRETAS:`);
    taxas.forEach(r => {
      console.log(`   ID: ${r.id} | ${r.data} | R$ ${parseFloat(r.total).toLocaleString('pt-BR', {minimumFractionDigits: 2})} | tipo_despesa_id: ${r.tipo_despesa_id}`);
    });

    // ==================== DESPESAS ====================
    console.log(`\n💸 DESPESAS (${despesas.length}):`);
    despesas.forEach(r => {
      console.log(`   ${r.data} | R$ ${parseFloat(r.total).toLocaleString('pt-BR', {minimumFractionDigits: 2})} | ${r.subcategoria} (${r.classificacao})`);
    });

    // ==================== SUGESTÕES ====================
    console.log(`\n🔍 ANÁLISE:`);
    if (percentualTaxas > 25) {
      console.log(`   ⚠️  ALERTA: Taxa de ${percentualTaxas}% é muito alta!`);
      console.log(`   Revise se todos os ${taxas.length} registros devem estar como "Taxa"`);
      console.log(`   Talvez alguns deveriam ser "Despesa" e não "Taxa"`);
    }
    if (taxas.length > 1 && taxas.some(t => parseFloat(t.total) > totalReceita * 0.1)) {
      const taxa_grande = taxas.find(t => parseFloat(t.total) > totalReceita * 0.1);
      console.log(`   ⚠️  Existe uma taxa muito grande (R$ ${parseFloat(taxa_grande.total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}) - verificar!`);
    }

    console.log('\n✅ Fim da revisão\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Executar
revisarTaxas();
