/**
 * Script de inicialização com migração automática
 *
 * Este script:
 * 1. Aguarda o PostgreSQL ficar pronto
 * 2. Verifica se o banco está vazio
 * 3. Se vazio, executa a migração SQLite → PostgreSQL
 * 4. Depois inicia a aplicação (app.js)
 */

const { Pool } = require('pg');
const path = require('path');

// NÃO carregar .env aqui - deixar que app.js faça
// require('dotenv').config();

// Configurar conexão PostgreSQL com fallback para Railway
// Se DATABASE_URL não estiver definida, usa a connection string interna do Railway
const connectionString = process.env.DATABASE_URL ||
  'postgresql://postgres:lqyUrQLrqStykmMiGBsQPDVYPrbhwsZs@postgres.railway.internal:5432/railway';

const pool = new Pool({
  connectionString: connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function waitForDatabase(maxAttempts = 30) {
  console.log('🔄 Aguardando PostgreSQL ficar pronto...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ PostgreSQL conectado com sucesso!');
      return true;
    } catch (err) {
      console.log(`⏳ Tentativa ${attempt}/${maxAttempts} - PostgreSQL ainda não está pronto...`);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2 segundos
      }
    }
  }

  throw new Error('❌ Timeout: PostgreSQL não ficou pronto após ' + maxAttempts + ' tentativas');
}

async function checkIfDatabaseEmpty() {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'faturamento'
    `);

    if (result.rows[0].count === 0) {
      console.log('📊 Tabela faturamento não existe - banco está vazio');
      return true;
    }

    const countResult = await pool.query('SELECT COUNT(*) as count FROM faturamento');
    const recordCount = parseInt(countResult.rows[0].count || 0);

    if (recordCount === 0) {
      console.log('📊 Tabela faturamento existe mas está vazia');
      return true;
    }

    console.log(`✅ Banco já tem ${recordCount} registros - pulando migração`);
    return false;
  } catch (err) {
    console.log('ℹ️ Erro ao verificar banco:', err.message);
    return true;
  }
}

async function runMigration() {
  console.log('\n🔄 Iniciando migração SQLite → PostgreSQL...\n');

  try {
    // Importar o script de migração
    const migrationModule = require('./migrate-sqlite-to-postgres.js');
    console.log('✅ Migração concluída com sucesso!\n');
  } catch (err) {
    console.error('❌ Erro durante migração:', err.message);
    // Não interrompe a inicialização se a migração falhar
    console.log('⚠️ Continuando mesmo com erro na migração...\n');
  }
}

async function startApplication() {
  console.log('🚀 Iniciando aplicação Node.js...\n');
  require('./app.js');
}

async function main() {
  try {
    // Aguardar PostgreSQL
    await waitForDatabase();

    // Verificar se banco está vazio
    const isDatabaseEmpty = await checkIfDatabaseEmpty();

    // Se vazio, rodar migração
    if (isDatabaseEmpty) {
      await runMigration();
    }

    // Iniciar aplicação
    await startApplication();
  } catch (err) {
    console.error('❌ Erro crítico durante inicialização:', err.message);
    process.exit(1);
  }
}

// Executar
main();
