const { Pool } = require('pg');
require('dotenv').config();

const isDev = process.env.NODE_ENV !== 'production';

// 🔍 DEBUG: Verificar se DATABASE_URL está sendo lido
console.log('🔍 DEBUG DATABASE_URL:');
console.log('  DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('  DATABASE_URL prefix:', process.env.DATABASE_URL?.substring(0, 20) || 'UNDEFINED');
console.log('  DATABASE_URL full:', process.env.DATABASE_URL || 'NOT FOUND');
console.log('  NODE_ENV:', process.env.NODE_ENV);

// Configuração do Pool de conexões PostgreSQL
// Fallback para conexão Railway se DATABASE_URL não for injetada
const connectionString = process.env.DATABASE_URL ||
  'postgresql://postgres:lqyUrQLrqStykmMiGBsQPDVYPrbhwsZs@postgres.railway.internal:5432/railway';

const pool = new Pool({
  connectionString: connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Tratamento de erros do pool
pool.on('error', (err) => {
  console.error('❌ Erro não esperado no pool PostgreSQL:', err);
});

pool.on('connect', () => {
  if (isDev) console.log('✅ Nova conexão PostgreSQL estabelecida');
});

// Inicializar banco de dados
async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando banco de dados PostgreSQL...');

    // 1. Criar tabela restaurantes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS restaurantes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE,
        canal VARCHAR(50) NOT NULL,
        ativa BOOLEAN DEFAULT true,
        cliente_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela restaurantes criada/verificada');

    // 2. Criar tabela tipo_despesa
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tipo_despesa (
        id SERIAL PRIMARY KEY,
        classificacao VARCHAR(50) NOT NULL,
        subcategoria VARCHAR(100) NOT NULL,
        descricao VARCHAR(255),
        ativa BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(classificacao, subcategoria)
      )
    `);
    console.log('✅ Tabela tipo_despesa criada/verificada');

    // 3. Criar tabela faturamento
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faturamento (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        categoria VARCHAR(50) NOT NULL DEFAULT 'Salão',
        tipo VARCHAR(20) NOT NULL DEFAULT 'receita',
        tipo_despesa_id INTEGER REFERENCES tipo_despesa(id),
        status BOOLEAN DEFAULT false,
        categoria_produto VARCHAR(50) DEFAULT 'Comida',
        enviado_em TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela faturamento criada/verificada');

    // Criar índices para performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faturamento_data ON faturamento(data DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faturamento_status ON faturamento(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faturamento_created ON faturamento(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faturamento_categoria ON faturamento(categoria)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faturamento_tipo_despesa_id ON faturamento(tipo_despesa_id)`);
    console.log('✅ Índices criados/verificados');

    // 4. Criar tabela notas_fiscais
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notas_fiscais (
        id SERIAL PRIMARY KEY,
        numero_nf VARCHAR(50) UNIQUE,
        fornecedor_nome VARCHAR(255),
        fornecedor_cnpj VARCHAR(14),
        data_emissao DATE,
        data_vencimento DATE,
        valor_total DECIMAL(10,2),
        descricao TEXT,
        classificacao_sugerida VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pendente',
        xml_content TEXT,
        pdf_filename VARCHAR(255),
        tipo_despesa_id INTEGER REFERENCES tipo_despesa(id),
        faturamento_id INTEGER REFERENCES faturamento(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processado_em TIMESTAMP
      )
    `);
    console.log('✅ Tabela notas_fiscais criada/verificada');

    // Criar índices para notas_fiscais
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notas_numero ON notas_fiscais(numero_nf)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notas_status ON notas_fiscais(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notas_created ON notas_fiscais(created_at DESC)`);

    // 5. Inserir dados padrão
    await insertDefaultRestaurantes();
    await insertDefaultTiposDespesa();

    console.log('✅ Database inicializado com sucesso');
  } catch (err) {
    console.error('❌ Erro ao inicializar database:', err.message);
    throw err;
  }
}

// Inserir restaurantes padrão
async function insertDefaultRestaurantes() {
  const restaurantes = [
    { nome: 'KAIA - Salão', canal: 'Salão' },
    { nome: 'KAIA - iFood', canal: 'iFood' },
    { nome: 'KAIA - Keeta', canal: 'Keeta' },
    { nome: 'KAIA - 99Food', canal: '99Food' }
  ];

  for (const rest of restaurantes) {
    try {
      await pool.query(
        `INSERT INTO restaurantes (nome, canal, ativa)
         VALUES ($1, $2, true)
         ON CONFLICT (nome) DO NOTHING`,
        [rest.nome, rest.canal]
      );
    } catch (err) {
      console.error(`Erro ao inserir restaurante ${rest.nome}:`, err.message);
    }
  }
}

// Inserir tipos de despesa padrão
async function insertDefaultTiposDespesa() {
  const tiposDespesa = [
    // CMV
    { classificacao: 'CMV', subcategoria: 'Hortifruti', descricao: 'Vegetais e frutas' },
    { classificacao: 'CMV', subcategoria: 'Padaria', descricao: 'Pão, massas e derivados' },
    { classificacao: 'CMV', subcategoria: 'Óleo', descricao: 'Óleos e gorduras' },
    { classificacao: 'CMV', subcategoria: 'Batata', descricao: 'Batatas e tubérculos' },
    { classificacao: 'CMV', subcategoria: 'Carne', descricao: 'Carnes, peixes e proteínas' },
    { classificacao: 'CMV', subcategoria: 'Embalagem', descricao: 'Embalagens e descartáveis' },
    { classificacao: 'CMV', subcategoria: 'Bebida', descricao: 'Bebidas diversas' },
    { classificacao: 'CMV', subcategoria: 'Outros', descricao: 'Outros insumos' },
    // Operacional
    { classificacao: 'Operacional', subcategoria: 'Aluguel', descricao: 'Aluguel do estabelecimento' },
    { classificacao: 'Operacional', subcategoria: 'Utilidades', descricao: 'Água, luz, gás' },
    { classificacao: 'Operacional', subcategoria: 'Limpeza', descricao: 'Materiais de limpeza' },
    { classificacao: 'Operacional', subcategoria: 'Manutenção', descricao: 'Manutenção e reparos' },
    { classificacao: 'Operacional', subcategoria: 'Taxas', descricao: 'Taxas de plataforma' },
    // Administrativa
    { classificacao: 'Administrativa', subcategoria: 'Impostos', descricao: 'Impostos e taxas' },
    { classificacao: 'Administrativa', subcategoria: 'Pessoal', descricao: 'Salários e encargos' },
    { classificacao: 'Administrativa', subcategoria: 'Software', descricao: 'Ferramentas e sistemas' },
    // Financeira
    { classificacao: 'Financeira', subcategoria: 'Juros', descricao: 'Juros e multas' },
    { classificacao: 'Financeira', subcategoria: 'Taxas', descricao: 'Taxas bancárias' }
  ];

  for (const tipo of tiposDespesa) {
    try {
      await pool.query(
        `INSERT INTO tipo_despesa (classificacao, subcategoria, descricao, ativa)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (classificacao, subcategoria) DO NOTHING`,
        [tipo.classificacao, tipo.subcategoria, tipo.descricao]
      );
    } catch (err) {
      console.error(`Erro ao inserir tipo_despesa ${tipo.subcategoria}:`, err.message);
    }
  }
}

// Funções compatíveis com a interface anterior
async function runAsync(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return { id: result.rows[0]?.id, changes: result.rowCount };
  } catch (err) {
    console.error('❌ Erro em runAsync:', err.message);
    throw err;
  }
}

async function getAsync(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows[0];
  } catch (err) {
    console.error('❌ Erro em getAsync:', err.message);
    throw err;
  }
}

async function allAsync(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err) {
    console.error('❌ Erro em allAsync:', err.message);
    throw err;
  }
}

// Inicializar ao carregar o módulo
initializeDatabase().catch(err => {
  console.error('❌ Falha ao inicializar database:', err);
  process.exit(1);
});

module.exports = {
  pool,
  runAsync,
  getAsync,
  allAsync,
  initializeDatabase
};
