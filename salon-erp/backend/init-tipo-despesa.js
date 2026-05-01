/**
 * Script para inicializar a tabela tipo_despesa com dados padrão
 * Execute com: node init-tipo-despesa.js
 */

const { pool } = require('./database');
require('dotenv').config();

async function initTipoDespesa() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       Inicializando tipo_despesa com dados padrão         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // 1. Verificar se tabela existe e quantos registros tem
    console.log('1️⃣  Verificando tabela tipo_despesa...\n');
    const checkTable = await pool.query(`
      SELECT COUNT(*) as cnt FROM tipo_despesa WHERE ativa = 1
    `);
    const countAtivos = parseInt(checkTable.rows[0].cnt);
    console.log(`   Registros ativos: ${countAtivos}\n`);

    if (countAtivos > 0) {
      console.log('   ✅ Tabela já possui dados. Abortando inicialização.\n');
      await pool.end();
      process.exit(0);
    }

    // 2. Inserir dados padrão
    console.log('2️⃣  Inserindo dados padrão...\n');

    const dadosPadroes = [
      // CMV
      { classificacao: 'CMV', subcategoria: 'Taxas', descricao: 'Taxas de delivery (iFood, Uber, etc)' },
      { classificacao: 'CMV', subcategoria: 'Bebidas', descricao: 'Custo de bebidas' },
      { classificacao: 'CMV', subcategoria: 'Comidas', descricao: 'Custo de alimentos' },
      { classificacao: 'CMV', subcategoria: 'Açúcar/Temperos', descricao: 'Açúcar, sal, temperos' },
      { classificacao: 'CMV', subcategoria: 'Embalagem', descricao: 'Sacolas, caixas, copos' },

      // Operacional
      { classificacao: 'Operacional', subcategoria: 'Aluguel', descricao: 'Aluguel do estabelecimento' },
      { classificacao: 'Operacional', subcategoria: 'Energia', descricao: 'Conta de energia/luz' },
      { classificacao: 'Operacional', subcategoria: 'Água', descricao: 'Conta de água' },
      { classificacao: 'Operacional', subcategoria: 'Telefone/Internet', descricao: 'Internet e telefone' },
      { classificacao: 'Operacional', subcategoria: 'Limpeza', descricao: 'Produtos de limpeza' },
      { classificacao: 'Operacional', subcategoria: 'Manutenção', descricao: 'Manutenção de equipamentos' },

      // Administrativa
      { classificacao: 'Administrativa', subcategoria: 'Folha de Pagamento', descricao: 'Salários e encargos' },
      { classificacao: 'Administrativa', subcategoria: 'Contador', descricao: 'Serviços contábeis' },
      { classificacao: 'Administrativa', subcategoria: 'Seguros', descricao: 'Seguros diversos' },
      { classificacao: 'Administrativa', subcategoria: 'Material Administrativo', descricao: 'Papéis, canetas, etc' },

      // Financeira
      { classificacao: 'Financeira', subcategoria: 'Juros e Multas', descricao: 'Juros e multas bancárias' },
      { classificacao: 'Financeira', subcategoria: 'Custos Financeiros', descricao: 'Taxa de cartão, POS' },
      { classificacao: 'Financeira', subcategoria: 'Empréstimos', descricao: 'Juros de empréstimos' }
    ];

    for (const dado of dadosPadroes) {
      await pool.query(
        `INSERT INTO tipo_despesa (classificacao, subcategoria, descricao, ativa)
         VALUES ($1, $2, $3, 1)`,
        [dado.classificacao, dado.subcategoria, dado.descricao]
      );
      console.log(`   ✅ ${dado.classificacao} > ${dado.subcategoria}`);
    }

    console.log(`\n   Total inserido: ${dadosPadroes.length} registros\n`);

    // 3. Verificar resultado
    console.log('3️⃣  Verificando resultado...\n');
    const resultado = await pool.query(`
      SELECT classificacao, COUNT(*) as cnt
      FROM tipo_despesa
      WHERE ativa = 1
      GROUP BY classificacao
      ORDER BY classificacao
    `);

    resultado.rows.forEach(row => {
      console.log(`   ${row.classificacao}: ${row.cnt} subcategorias`);
    });

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         Inicialização concluída com sucesso! ✅          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

initTipoDespesa();
