/**
 * Script de validação pós-deploy
 * Execute após o redeploy no Railway para confirmar que tudo funciona
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     Erro: ${err.message}`);
    testsFailed++;
  }
}

async function runValidation() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       VALIDAÇÃO PÓS-DEPLOY - SALON ERP POSTGRESQL           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // =================================================================
  // SEÇÃO 1: CONECTIVIDADE
  // =================================================================
  console.log('📡 SEÇÃO 1: CONECTIVIDADE\n');

  await test('Conexão com PostgreSQL', async () => {
    const result = await pool.query('SELECT NOW()');
    if (!result.rows[0]) throw new Error('Nenhuma resposta');
  });

  await test('DATABASE_URL configurada corretamente', async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não definida');
    if (!process.env.DATABASE_URL.includes('postgresql')) throw new Error('DATABASE_URL não é PostgreSQL');
  });

  // =================================================================
  // SEÇÃO 2: INTEGRIDADE DOS DADOS
  // =================================================================
  console.log('\n📊 SEÇÃO 2: INTEGRIDADE DOS DADOS\n');

  await test('Tabela faturamento existe', async () => {
    const result = await pool.query(`
      SELECT COUNT(*) as cnt FROM information_schema.tables
      WHERE table_name = 'faturamento'
    `);
    if (result.rows[0].cnt === 0) throw new Error('Tabela não existe');
  });

  await test('Pelo menos 100 registros de faturamento', async () => {
    const result = await pool.query('SELECT COUNT(*) as cnt FROM faturamento');
    const count = parseInt(result.rows[0].cnt);
    if (count < 100) throw new Error(`Apenas ${count} registros (esperado >= 100)`);
  });

  await test('Apenas 4 categorias válidas', async () => {
    const result = await pool.query(`
      SELECT COUNT(DISTINCT categoria) as cnt
      FROM faturamento
      WHERE categoria IN ('Salão', 'iFood', 'Keeta', '99Food')
    `);
    const validCount = parseInt(result.rows[0].cnt);
    if (validCount !== 4) throw new Error(`${validCount} categorias válidas (esperado 4)`);
  });

  await test('Nenhuma categoria inválida no banco', async () => {
    const result = await pool.query(`
      SELECT COUNT(DISTINCT categoria) as cnt
      FROM faturamento
      WHERE categoria NOT IN ('Salão', 'iFood', 'Keeta', '99Food')
    `);
    const invalidCount = parseInt(result.rows[0].cnt);
    if (invalidCount > 0) throw new Error(`${invalidCount} categorias inválidas encontradas`);
  });

  // =================================================================
  // SEÇÃO 3: DADOS POR CATEGORIA
  // =================================================================
  console.log('\n💰 SEÇÃO 3: DADOS POR CATEGORIA\n');

  await test('Salão tem receita > R$ 90.000', async () => {
    const result = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END), 0) as receita
      FROM faturamento WHERE categoria = 'Salão'
    `);
    const receita = parseFloat(result.rows[0].receita || 0);
    if (receita < 90000) throw new Error(`Receita: R$ ${receita.toFixed(2)}`);
    console.log(`        → Salão: R$ ${receita.toFixed(2)}`);
  });

  await test('iFood tem receita > R$ 50.000', async () => {
    const result = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END), 0) as receita
      FROM faturamento WHERE categoria = 'iFood'
    `);
    const receita = parseFloat(result.rows[0].receita || 0);
    if (receita < 50000) throw new Error(`Receita: R$ ${receita.toFixed(2)}`);
    console.log(`        → iFood: R$ ${receita.toFixed(2)}`);
  });

  await test('Keeta tem receita > R$ 50.000', async () => {
    const result = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END), 0) as receita
      FROM faturamento WHERE categoria = 'Keeta'
    `);
    const receita = parseFloat(result.rows[0].receita || 0);
    if (receita < 50000) throw new Error(`Receita: R$ ${receita.toFixed(2)}`);
    console.log(`        → Keeta: R$ ${receita.toFixed(2)}`);
  });

  await test('99Food tem receita > R$ 40.000', async () => {
    const result = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END), 0) as receita
      FROM faturamento WHERE categoria = '99Food'
    `);
    const receita = parseFloat(result.rows[0].receita || 0);
    if (receita < 40000) throw new Error(`Receita: R$ ${receita.toFixed(2)}`);
    console.log(`        → 99Food: R$ ${receita.toFixed(2)}`);
  });

  // =================================================================
  // SEÇÃO 4: QUERIES DE DATA (POSTGRES SYNTAX)
  // =================================================================
  console.log('\n📅 SEÇÃO 4: QUERIES DE DATA (PostgreSQL)\n');

  await test('Query de data CURRENT_DATE - INTERVAL funciona', async () => {
    const result = await pool.query(`
      SELECT COUNT(*) as cnt FROM faturamento
      WHERE data >= CURRENT_DATE - INTERVAL '30 days'
    `);
    const count = parseInt(result.rows[0].cnt);
    if (count === 0) throw new Error('Nenhum registro nos últimos 30 dias');
    console.log(`        → ${count} registros nos últimos 30 dias`);
  });

  await test('Datas estão em formato DATE (não TEXT)', async () => {
    const result = await pool.query(`
      SELECT pg_typeof(data) as tipo FROM faturamento LIMIT 1
    `);
    if (!result.rows[0].tipo.includes('date')) throw new Error(`Tipo: ${result.rows[0].tipo}`);
  });

  // =================================================================
  // SEÇÃO 5: NOTAS FISCAIS
  // =================================================================
  console.log('\n📋 SEÇÃO 5: NOTAS FISCAIS\n');

  await test('Tabela notas_fiscais existe', async () => {
    const result = await pool.query(`
      SELECT COUNT(*) as cnt FROM information_schema.tables
      WHERE table_name = 'notas_fiscais'
    `);
    if (result.rows[0].cnt === 0) throw new Error('Tabela não existe');
  });

  await test('Notas fiscais conectadas corretamente', async () => {
    const result = await pool.query('SELECT COUNT(*) as cnt FROM notas_fiscais');
    const count = parseInt(result.rows[0].cnt);
    if (count === 0) throw new Error('Nenhuma nota fiscal no banco');
    console.log(`        → ${count} notas fiscais`);
  });

  // =================================================================
  // SEÇÃO 6: CAMPOS PostgreSQL (lowercase)
  // =================================================================
  console.log('\n🔤 SEÇÃO 6: CAMPOS PostgreSQL (Lowercase)\n');

  await test('obterStats retorna campos em lowercase', async () => {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalreceita
      FROM faturamento WHERE data >= '2026-04-01' AND data <= '2026-04-30'
    `);
    if (!result.rows[0].totalreceita) throw new Error('Campo totalreceita vazio');
  });

  await test('Campos podem ser parseFloat sem problemas', async () => {
    const result = await pool.query(`
      SELECT CAST(SUM(total) AS DECIMAL(10,2)) as total FROM faturamento LIMIT 1
    `);
    const value = parseFloat(result.rows[0].total);
    if (isNaN(value)) throw new Error('Valor não é um número válido');
  });

  // =================================================================
  // RESUMO FINAL
  // =================================================================
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMO FINAL                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const totalTests = testsPassed + testsFailed;
  const percentage = totalTests > 0 ? ((testsPassed / totalTests) * 100).toFixed(0) : 0;

  console.log(`✅ Testes passados:  ${testsPassed}/${totalTests}`);
  console.log(`❌ Testes falhados:  ${testsFailed}/${totalTests}`);
  console.log(`📊 Taxa de sucesso:  ${percentage}%\n`);

  if (testsFailed === 0) {
    console.log('🎉 TUDO OK! Deploy bem-sucedido!\n');
    console.log('Próximos passos:');
    console.log('  1. Acesse seu app no Railway URL');
    console.log('  2. Dashboard deve mostrar valores corretos');
    console.log('  3. Gráficos devem carregar');
    console.log('  4. Notas fiscais devem aparecer\n');
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique os erros acima.\n');
  }

  await pool.end();
  process.exit(testsFailed > 0 ? 1 : 0);
}

runValidation().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
