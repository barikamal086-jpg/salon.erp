const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');
const db = new sqlite3.Database(dbPath);

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║         CMV POR CANAL COM RECEITA LÍQUIDA (Abril 2026)        ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const dataInicio = '2026-04-01';
const dataFim = '2026-04-30';

// Query 1: Receita total por canal
db.all(`
  SELECT
    categoria,
    SUM(total) as receita_total
  FROM faturamento
  WHERE tipo = 'receita'
    AND categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
    AND data BETWEEN ? AND ?
  GROUP BY categoria
  ORDER BY receita_total DESC
`, [dataInicio, dataFim], (err, receitas) => {
  if (err) {
    console.error('❌ Erro em receita_total:', err);
    process.exit(1);
  }

  console.log('💰 RECEITA TOTAL POR CANAL:\n');
  receitas.forEach(r => {
    console.log(`   ${r.categoria.padEnd(12)} | R$ ${parseFloat(r.receita_total).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
  });

  // Query 2: Taxas (despesas com subcategoria='Taxas')
  db.all(`
    SELECT
      f.categoria,
      SUM(f.total) as total_taxas
    FROM faturamento f
    LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
    WHERE f.tipo = 'despesa'
      AND f.categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
      AND td.subcategoria = 'Taxas'
      AND f.data BETWEEN ? AND ?
    GROUP BY f.categoria
  `, [dataInicio, dataFim], (err, taxas) => {
    console.log('\n🏷️ TAXAS POR CANAL (subcategoria = "Taxas"):\n');

    const taxasMap = {};
    taxas.forEach(t => {
      taxasMap[t.categoria] = t.total_taxas;
      console.log(`   ${t.categoria.padEnd(12)} | R$ ${parseFloat(t.total_taxas).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    });

    // Query 3: CMV (despesas com classificacao='CMV')
    db.all(`
      SELECT
        f.categoria,
        SUM(f.total) as total_cmv,
        COUNT(f.id) as qtd_lancamentos
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE f.tipo = 'despesa'
        AND f.categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
        AND td.classificacao = 'CMV'
        AND f.data BETWEEN ? AND ?
      GROUP BY f.categoria
    `, [dataInicio, dataFim], (err, cmvs) => {
      console.log('\n📊 CMV POR CANAL (classificacao = "CMV"):\n');

      const cmvMap = {};
      cmvs.forEach(c => {
        cmvMap[c.categoria] = { total: c.total_cmv, qtd: c.qtd_lancamentos };
        console.log(`   ${c.categoria.padEnd(12)} | R$ ${parseFloat(c.total_cmv).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${c.qtd_lancamentos} itens)`);
      });

      // Compilar resultado final
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║               CÁLCULO FINAL: CMV% PELA RECEITA LÍQUIDA         ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');

      const canais = ['Salão', 'iFood', '99Food', 'Keeta'];
      const resultado = [];

      canais.forEach(canal => {
        const receita = receitas.find(r => r.categoria === canal)?.receita_total || 0;
        const taxas = taxasMap[canal] || 0;
        const cmvTotal = cmvMap[canal]?.total || 0;
        const cmvQtd = cmvMap[canal]?.qtd || 0;

        const receitaLiquida = receita - taxas;
        const cmvPercentual = receitaLiquida > 0 ? (cmvTotal / receitaLiquida) * 100 : 0;

        resultado.push({
          canal,
          receita,
          taxas,
          receitaLiquida,
          cmvTotal,
          cmvQtd,
          cmvPercentual
        });

        console.log(`\n🏪 ${canal}`);
        console.log(`   Receita Total ............ R$ ${receita.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        console.log(`   (-) Taxas ............... R$ ${taxas.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        console.log(`   (=) Receita Líquida ...... R$ ${receitaLiquida.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        console.log(`   (-) CMV ................. R$ ${cmvTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${cmvQtd} itens)`);
        console.log(`   CMV % ................... ${cmvPercentual.toFixed(2)}%`);
      });

      // Resumo comparativo
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                    RESUMO COMPARATIVO                        ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');

      console.log('Canal'.padEnd(12) + '| Receita'.padEnd(18) + '| Taxas'.padEnd(18) + '| Receita Líquida'.padEnd(18) + '| CMV'.padEnd(18) + '| CMV %');
      console.log('-'.repeat(100));

      resultado.forEach(r => {
        console.log(
          r.canal.padEnd(12) + '| ' +
          r.receita.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
          r.taxas.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
          r.receitaLiquida.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
          r.cmvTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
          r.cmvPercentual.toFixed(2).padStart(6) + '%'
        );
      });

      // Total geral
      const totalReceita = resultado.reduce((sum, r) => sum + r.receita, 0);
      const totalTaxas = resultado.reduce((sum, r) => sum + r.taxas, 0);
      const totalReceitaLiquida = resultado.reduce((sum, r) => sum + r.receitaLiquida, 0);
      const totalCMV = resultado.reduce((sum, r) => sum + r.cmvTotal, 0);
      const totalCMVPercentual = totalReceitaLiquida > 0 ? (totalCMV / totalReceitaLiquida) * 100 : 0;

      console.log('-'.repeat(100));
      console.log(
        'TOTAL'.padEnd(12) + '| ' +
        totalReceita.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
        totalTaxas.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
        totalReceitaLiquida.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
        totalCMV.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
        totalCMVPercentual.toFixed(2).padStart(6) + '%'
      );

      console.log('\n');
      db.close();
    });
  });
});
