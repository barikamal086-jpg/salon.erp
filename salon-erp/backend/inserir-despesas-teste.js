/**
 * Inserir despesas de teste para CMV Analysis
 * Execute com: node inserir-despesas-teste.js
 */

const { pool } = require('./database');
require('dotenv').config();

async function inserirDespesasTeste() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       Inserindo despesas de teste para Abril 2026         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Verificar se já tem despesas
    console.log('1️⃣  Verificando despesas existentes...\n');
    const checkResult = await pool.query(`
      SELECT COUNT(*) as cnt FROM faturamento
      WHERE tipo = 'despesa' AND data >= '2026-04-01' AND data <= '2026-04-30'
    `);
    const count = parseInt(checkResult.rows[0].cnt);

    if (count > 0) {
      console.log(`   ✅ Já existem ${count} despesas em Abril 2026\n`);
      console.log('   Abortando inserção.\n');
      await pool.end();
      process.exit(0);
    }

    console.log('   ⚠️  Nenhuma despesa encontrada. Inserindo...\n');

    // 2. Inserir despesas distribuídas por categoria e data
    console.log('2️⃣  Inserindo despesas de teste:\n');

    const despesasTeste = [
      // Salão - despesas reais (não são taxas)
      { data: '2026-04-05', categoria: 'Salão', total: 500, descricao: 'Aluguel proporcional' },
      { data: '2026-04-10', categoria: 'Salão', total: 300, descricao: 'Energia' },
      { data: '2026-04-15', categoria: 'Salão', total: 200, descricao: 'Água' },
      { data: '2026-04-20', categoria: 'Salão', total: 150, descricao: 'Manutenção' },
      { data: '2026-04-25', categoria: 'Salão', total: 100, descricao: 'Limpeza' },

      // iFood - taxas
      { data: '2026-04-02', categoria: 'iFood', total: 1000, descricao: 'Taxa iFood 15%' },
      { data: '2026-04-08', categoria: 'iFood', total: 1200, descricao: 'Taxa iFood 15%' },
      { data: '2026-04-16', categoria: 'iFood', total: 1100, descricao: 'Taxa iFood 15%' },
      { data: '2026-04-23', categoria: 'iFood', total: 950, descricao: 'Taxa iFood 15%' },

      // Keeta - taxas
      { data: '2026-04-03', categoria: 'Keeta', total: 900, descricao: 'Taxa Keeta 12%' },
      { data: '2026-04-09', categoria: 'Keeta', total: 1050, descricao: 'Taxa Keeta 12%' },
      { data: '2026-04-17', categoria: 'Keeta', total: 1000, descricao: 'Taxa Keeta 12%' },
      { data: '2026-04-24', categoria: 'Keeta', total: 850, descricao: 'Taxa Keeta 12%' },

      // 99Food - taxas
      { data: '2026-04-04', categoria: '99Food', total: 600, descricao: 'Taxa 99Food 18%' },
      { data: '2026-04-11', categoria: '99Food', total: 700, descricao: 'Taxa 99Food 18%' },
      { data: '2026-04-19', categoria: '99Food', total: 680, descricao: 'Taxa 99Food 18%' },
      { data: '2026-04-27', categoria: '99Food', total: 620, descricao: 'Taxa 99Food 18%' }
    ];

    let inseridos = 0;
    for (const despesa of despesasTeste) {
      try {
        await pool.query(
          `INSERT INTO faturamento (data, total, categoria, tipo, descricao, categoria_produto)
           VALUES ($1, $2, $3, 'despesa', $4, 'Despesa')`,
          [despesa.data, despesa.total, despesa.categoria, despesa.descricao]
        );
        console.log(`   ✅ ${despesa.data} | ${despesa.categoria.padEnd(10)} | R$ ${despesa.total} | ${despesa.descricao}`);
        inseridos++;
      } catch (err) {
        console.error(`   ❌ Erro ao inserir despesa de ${despesa.categoria}:`, err.message);
      }
    }

    console.log(`\n   Total inserido: ${inseridos}/${despesasTeste.length} despesas\n`);

    // 3. Verificar resultado
    console.log('3️⃣  Verificando resultado:\n');
    const verificaResult = await pool.query(`
      SELECT COUNT(*) as cnt, SUM(total) as total
      FROM faturamento
      WHERE tipo = 'despesa' AND data >= '2026-04-01' AND data <= '2026-04-30'
    `);

    const finalCount = parseInt(verificaResult.rows[0].cnt);
    const finalTotal = parseFloat(verificaResult.rows[0].total || 0);

    console.log(`   Total de despesas: ${finalCount}`);
    console.log(`   Valor total: R$ ${finalTotal.toFixed(2)}\n`);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          Despesas de teste inseridas com sucesso!         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Próximas ações:');
    console.log('1. Recarregue o dashboard (F5)');
    console.log('2. Verifique se "Performance por Categoria" agora mostra despesas');
    console.log('3. Verifique se CMV % não é mais 0%\n');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

inserirDespesasTeste();
