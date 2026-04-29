const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');
const db = new sqlite3.Database(dbPath);

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║   CMV COM ALOCAÇÃO PROPORCIONAL (Bebidas separadas - Abril 2026)   ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

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

  // Query 2: Taxas por canal
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

    // Query 3: CMV Bebidas (subcategoria='Bebida')
    db.all(`
      SELECT
        f.categoria,
        SUM(f.total) as total_cmv_bebidas,
        COUNT(f.id) as qtd_lancamentos
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE f.tipo = 'despesa'
        AND f.categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
        AND td.classificacao = 'CMV'
        AND td.subcategoria = 'Bebida'
        AND f.data BETWEEN ? AND ?
      GROUP BY f.categoria
    `, [dataInicio, dataFim], (err, bebidas) => {

      // Query 4: CMV Comida (todas as outras subcategorias CMV)
      db.all(`
        SELECT
          f.categoria,
          SUM(f.total) as total_cmv_comida,
          COUNT(f.id) as qtd_lancamentos
        FROM faturamento f
        LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
        WHERE f.tipo = 'despesa'
          AND f.categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
          AND td.classificacao = 'CMV'
          AND td.subcategoria != 'Bebida'
          AND f.data BETWEEN ? AND ?
        GROUP BY f.categoria
      `, [dataInicio, dataFim], (err, comidas) => {

        // Preparar mapas
        const taxasMap = {};
        taxas.forEach(t => {
          taxasMap[t.categoria] = t.total_taxas || 0;
        });

        const bebidasMap = {};
        bebidas.forEach(b => {
          bebidasMap[b.categoria] = { total: b.total_cmv_bebidas || 0, qtd: b.qtd_lancamentos || 0 };
        });

        const comidasMap = {};
        comidas.forEach(c => {
          comidasMap[c.categoria] = { total: c.total_cmv_comida || 0, qtd: c.qtd_lancamentos || 0 };
        });

        // Mostrar breakdown
        console.log('📊 BREAKDOWN DO CMV - ABRIL 2026:\n');

        console.log('🍻 CMV BEBIDAS (subcategoria = "Bebida"):');
        let totalBebidasGeral = 0;
        receitas.forEach(r => {
          const bebida = bebidasMap[r.categoria] || { total: 0, qtd: 0 };
          totalBebidasGeral += bebida.total;
          console.log(`   ${r.categoria.padEnd(12)} | R$ ${bebida.total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${bebida.qtd} itens)`);
        });
        console.log(`   TOTAL BEBIDAS ......... R$ ${totalBebidasGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

        console.log('\n🍽️  CMV COMIDA (demais subcategorias):');
        let totalComidasGeral = 0;
        receitas.forEach(r => {
          const comida = comidasMap[r.categoria] || { total: 0, qtd: 0 };
          totalComidasGeral += comida.total;
          console.log(`   ${r.categoria.padEnd(12)} | R$ ${comida.total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${comida.qtd} itens)`);
        });
        console.log(`   TOTAL COMIDA ......... R$ ${totalComidasGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

        console.log('\n' + '═'.repeat(80));

        // Cálculo de receita líquida
        console.log('\n💰 RECEITA LÍQUIDA POR CANAL:\n');

        const receitaLiquidaMap = {};
        receitas.forEach(r => {
          const taxa = taxasMap[r.categoria] || 0;
          const receitaLiquida = r.receita_total - taxa;
          receitaLiquidaMap[r.categoria] = receitaLiquida;
          console.log(`   ${r.categoria.padEnd(12)} | R$ ${r.receita_total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} - R$ ${taxa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} = R$ ${receitaLiquida.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        });

        const totalReceitaLiquida = Object.values(receitaLiquidaMap).reduce((a, b) => a + b, 0);
        console.log(`   TOTAL ............... R$ ${totalReceitaLiquida.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

        console.log('\n' + '═'.repeat(80));

        // Cálculo de alocação
        console.log('\n📍 ALOCAÇÃO DO CMV COM SEPARAÇÃO DE BEBIDAS:\n');
        console.log('Fórmula:');
        console.log('  proporcao_canal = receita_liquida_canal / receita_liquida_total');
        console.log('  cmv_canal_comida = cmv_comida_total × proporcao_canal');
        console.log('  cmv_canal_final = cmv_canal_comida + (cmv_bebida_salao se for Salão)\n');

        const canais = ['Salão', 'iFood', '99Food', 'Keeta'];
        const resultado = [];

        canais.forEach(canal => {
          const receita = receitas.find(r => r.categoria === canal)?.receita_total || 0;
          const taxa = taxasMap[canal] || 0;
          const receitaLiquida = receitaLiquidaMap[canal] || 0;

          const bebida = bebidasMap[canal] || { total: 0, qtd: 0 };
          const comida = comidasMap[canal] || { total: 0, qtd: 0 };

          // Proporcionalidade usa APENAS comida
          const proporcao = totalReceitaLiquida > 0 ? receitaLiquida / totalReceitaLiquida : 0;
          const cmvComidaAlocada = totalComidasGeral * proporcao;

          // Salão recebe: cmv_comida_alocada + cmv_bebida
          const cmvFinal = canal === 'Salão'
            ? cmvComidaAlocada + totalBebidasGeral
            : cmvComidaAlocada;

          const cmvPercentual = receitaLiquida > 0 ? (cmvFinal / receitaLiquida) * 100 : 0;

          resultado.push({
            canal,
            receita,
            taxa,
            receitaLiquida,
            bebidaDireto: bebida.total,
            cmvComidaAlocada,
            totalCMV: cmvFinal,
            cmvPercentual,
            proporcao: proporcao * 100
          });

          console.log(`\n🏪 ${canal}`);
          console.log(`   Receita Bruta .................. R$ ${receita.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
          console.log(`   (-) Taxas ....................... R$ ${taxa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
          console.log(`   (=) Receita Líquida ............. R$ ${receitaLiquida.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
          console.log(`   \n   CMV Bebidas (direto) ............ R$ ${bebida.total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
          console.log(`   CMV Comida (alocado) ............ R$ ${cmvComidaAlocada.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (proporção: ${proporcao.toFixed(2)}%)`);
          console.log(`   \n   (=) TOTAL CMV ................... R$ ${cmvFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
          console.log(`   CMV % ........................... ${cmvPercentual.toFixed(2)}%`);
        });

        console.log('\n' + '═'.repeat(80));
        console.log('\n╔══════════════════════════════════════════════════════════════════╗');
        console.log('║                    OS 4 CARDS RECALCULADOS                       ║');
        console.log('╚══════════════════════════════════════════════════════════════════╝\n');

        console.log('Canal'.padEnd(12) + '| Receita Líquida'.padEnd(18) + '| CMV Total'.padEnd(18) + '| CMV %');
        console.log('-'.repeat(70));

        let totalReceitaLiqFinal = 0;
        let totalCMVFinal = 0;

        resultado.forEach(r => {
          totalReceitaLiqFinal += r.receitaLiquida;
          totalCMVFinal += r.totalCMV;
          console.log(
            r.canal.padEnd(12) + '| ' +
            r.receitaLiquida.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
            r.totalCMV.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
            r.cmvPercentual.toFixed(2).padStart(6) + '%'
          );
        });

        console.log('-'.repeat(70));
        const totalCMVPercentualFinal = totalReceitaLiqFinal > 0 ? (totalCMVFinal / totalReceitaLiqFinal) * 100 : 0;
        console.log(
          'TOTAL'.padEnd(12) + '| ' +
          totalReceitaLiqFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
          totalCMVFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).padStart(15) + ' | ' +
          totalCMVPercentualFinal.toFixed(2).padStart(6) + '%'
        );

        console.log('\n');
        db.close();
      });
    });
  });
});
