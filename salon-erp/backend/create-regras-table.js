const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTable() {
  try {
    console.log('🔧 Criando tabela regras_categoria_fornecedor...\n');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS regras_categoria_fornecedor (
        id SERIAL PRIMARY KEY,
        fornecedor_nome VARCHAR(255) UNIQUE NOT NULL,
        tipo_despesa_id INTEGER NOT NULL REFERENCES tipo_despesa(id),
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabela criada');

    // Criar índice
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_regra_fornecedor 
      ON regras_categoria_fornecedor(LOWER(fornecedor_nome))
    `);

    console.log('✅ Índice criado\n');

    // Verificar se há dados
    const result = await pool.query('SELECT COUNT(*) as cnt FROM regras_categoria_fornecedor');
    console.log(`📊 Regras cadastradas: ${result.rows[0].cnt}\n`);

    await pool.end();
    console.log('✅ Concluído!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

createTable();
