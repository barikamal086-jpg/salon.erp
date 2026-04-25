const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('✅ Conectado ao SQLite: ' + dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Tabela restaurantes (para suportar múltiplos restaurantes/canais)
  db.run(`
    CREATE TABLE IF NOT EXISTS restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome VARCHAR(255) NOT NULL UNIQUE,
      canal VARCHAR(50) NOT NULL,
      ativa BOOLEAN DEFAULT 1,
      cliente_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela restaurantes:', err.message);
    } else {
      console.log('✅ Tabela restaurantes criada/verificada');
      insertDefaultRestaurantes();
    }
  });

  // Tabela tipo_despesa (classificação de despesas)
  db.run(`
    CREATE TABLE IF NOT EXISTS tipo_despesa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      classificacao VARCHAR(50) NOT NULL,
      subcategoria VARCHAR(100) NOT NULL,
      descricao VARCHAR(255),
      ativa BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(classificacao, subcategoria)
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela tipo_despesa:', err.message);
    } else {
      console.log('✅ Tabela tipo_despesa criada/verificada');
      // Inserir dados padrão
      insertDefaultTiposDespesa();
    }
  });

  // Tabela faturamento (suporta receitas e despesas)
  db.run(`
    CREATE TABLE IF NOT EXISTS faturamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data DATE NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      categoria VARCHAR(50) NOT NULL DEFAULT 'Salão',
      tipo VARCHAR(20) NOT NULL DEFAULT 'receita',
      tipo_despesa_id INTEGER,
      status BOOLEAN DEFAULT 0,
      enviado_em TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tipo_despesa_id) REFERENCES tipo_despesa(id)
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela:', err.message);
    } else {
      console.log('✅ Tabela "faturamento" pronta');

      // Criar índices básicos dentro do callback
      db.run(`CREATE INDEX IF NOT EXISTS idx_data ON faturamento(data DESC)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_status ON faturamento(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_created ON faturamento(created_at DESC)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_categoria ON faturamento(categoria)`);

      // Criar índices básicos dentro do callback
      db.run(`CREATE INDEX IF NOT EXISTS idx_data ON faturamento(data DESC)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_status ON faturamento(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_created ON faturamento(created_at DESC)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_categoria ON faturamento(categoria)`);

      // Migrations após criar a tabela
      runMigrations();
    }
  });

  // Tabela notas_fiscais (para armazenar notas baixadas)
  db.run(`
    CREATE TABLE IF NOT EXISTS notas_fiscais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      tipo_despesa_id INTEGER,
      faturamento_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processado_em TIMESTAMP,
      FOREIGN KEY (tipo_despesa_id) REFERENCES tipo_despesa(id),
      FOREIGN KEY (faturamento_id) REFERENCES faturamento(id)
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela notas_fiscais:', err.message);
    } else {
      console.log('✅ Tabela "notas_fiscais" pronta');
      db.run(`CREATE INDEX IF NOT EXISTS idx_nf_numero ON notas_fiscais(numero_nf)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_nf_status ON notas_fiscais(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_nf_created ON notas_fiscais(created_at DESC)`);
    }
  });
}

function runMigrations() {
  setTimeout(() => {
    // 1. Verificar se precisa remover UNIQUE constraint
    db.all(`PRAGMA index_list(faturamento)`, (err, indexes) => {
      if (err) {
        console.error('Erro ao verificar índices:', err.message);
        return;
      }

      // Procura por índices UNIQUE na coluna 'data'
      const hasUniqueData = indexes && indexes.some(idx => idx.unique === 1 && idx.name.includes('data'));

      if (hasUniqueData) {
        console.log('⚠️  Removendo constraint UNIQUE da coluna "data"...');
        // SQLite não suporta DROP CONSTRAINT, então precisamos recriar a tabela
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          db.run(`
            CREATE TABLE faturamento_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              data DATE NOT NULL,
              total DECIMAL(10,2) NOT NULL CHECK(total > 0),
              categoria VARCHAR(50) NOT NULL DEFAULT 'Salão',
              status BOOLEAN DEFAULT 0,
              enviado_em TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) {
              console.error('Erro ao criar tabela temporária:', err.message);
              db.run('ROLLBACK');
              return;
            }

            // Copiar dados da tabela antiga
            db.run(`INSERT INTO faturamento_new SELECT * FROM faturamento`, (err) => {
              if (err) {
                console.error('Erro ao copiar dados:', err.message);
                db.run('ROLLBACK');
                return;
              }

              // Remover tabela antiga
              db.run(`DROP TABLE faturamento`, (err) => {
                if (err) {
                  console.error('Erro ao remover tabela antiga:', err.message);
                  db.run('ROLLBACK');
                  return;
                }

                // Renomear tabela nova
                db.run(`ALTER TABLE faturamento_new RENAME TO faturamento`, (err) => {
                  if (err) {
                    console.error('Erro ao renomear tabela:', err.message);
                    db.run('ROLLBACK');
                    return;
                  }

                  db.run('COMMIT', () => {
                    console.log('✅ Constraint UNIQUE removido com sucesso');
                    // Recriar índices
                    db.run(`CREATE INDEX IF NOT EXISTS idx_data ON faturamento(data DESC)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_status ON faturamento(status)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_created ON faturamento(created_at DESC)`);
                    db.run(`CREATE INDEX IF NOT EXISTS idx_categoria ON faturamento(categoria)`);
                  });
                });
              });
            });
          });
        });
      }
    });

    // 2. Verificar e adicionar coluna 'data_vencimento' em notas_fiscais se não existir
    db.all(`PRAGMA table_info(notas_fiscais)`, (err, columns) => {
      if (err) {
        console.error('Erro ao verificar colunas de notas_fiscais:', err.message);
        return;
      }

      if (columns && columns.length > 0) {
        const hasDataVencimento = columns.some(col => col.name === 'data_vencimento');

        if (!hasDataVencimento) {
          console.log('⚠️  Coluna "data_vencimento" não existe em notas_fiscais, adicionando...');
          db.run(`ALTER TABLE notas_fiscais ADD COLUMN data_vencimento DATE`, (err) => {
            if (err) {
              console.error('Erro ao adicionar coluna data_vencimento:', err.message);
            } else {
              console.log('✅ Coluna "data_vencimento" adicionada com sucesso');
            }
          });
        }
      }
    });

    // 3. Verificar e adicionar colunas 'categoria' e 'tipo' se não existirem
    db.all(`PRAGMA table_info(faturamento)`, (err, columns) => {
      if (err) {
        console.error('Erro ao verificar colunas:', err.message);
        return;
      }

      if (columns && columns.length > 0) {
        const hasCategoria = columns.some(col => col.name === 'categoria');
        const hasTipo = columns.some(col => col.name === 'tipo');

        // Adicionar categoria se não existir
        if (!hasCategoria) {
          console.log('⚠️  Coluna "categoria" não existe, adicionando...');
          db.run(`ALTER TABLE faturamento ADD COLUMN categoria VARCHAR(50) DEFAULT 'Salão'`, (err) => {
            if (err) {
              console.error('Erro ao adicionar coluna categoria:', err.message);
            } else {
              console.log('✅ Coluna "categoria" adicionada com sucesso');
              db.run(`CREATE INDEX IF NOT EXISTS idx_categoria ON faturamento(categoria)`);
            }
          });
        } else {
          // Coluna já existe, apenas criar índice se não existir
          db.run(`CREATE INDEX IF NOT EXISTS idx_categoria ON faturamento(categoria)`, (err) => {
            if (err) {
              console.error('Erro ao criar índice categoria:', err.message);
            }
          });
        }

        // Adicionar tipo se não existir
        if (!hasTipo) {
          console.log('⚠️  Coluna "tipo" não existe, adicionando...');
          db.run(`ALTER TABLE faturamento ADD COLUMN tipo VARCHAR(20) DEFAULT 'receita'`, (err) => {
            if (err) {
              console.error('Erro ao adicionar coluna tipo:', err.message);
            } else {
              console.log('✅ Coluna "tipo" adicionada com sucesso');
              db.run(`CREATE INDEX IF NOT EXISTS idx_tipo ON faturamento(tipo)`);
            }
          });
        } else {
          db.run(`CREATE INDEX IF NOT EXISTS idx_tipo ON faturamento(tipo)`, (err) => {
            if (err) {
              console.error('Erro ao criar índice tipo:', err.message);
            }
          });
        }

        // Adicionar tipo_despesa_id se não existir
        const hasTipoDespesaId = columns.some(col => col.name === 'tipo_despesa_id');
        if (!hasTipoDespesaId) {
          console.log('⚠️  Coluna "tipo_despesa_id" não existe, adicionando...');
          db.run(`ALTER TABLE faturamento ADD COLUMN tipo_despesa_id INTEGER`, (err) => {
            if (err) {
              console.error('Erro ao adicionar coluna tipo_despesa_id:', err.message);
            } else {
              console.log('✅ Coluna "tipo_despesa_id" adicionada com sucesso');
              db.run(`CREATE INDEX IF NOT EXISTS idx_tipo_despesa_id ON faturamento(tipo_despesa_id)`);
            }
          });
        } else {
          db.run(`CREATE INDEX IF NOT EXISTS idx_tipo_despesa_id ON faturamento(tipo_despesa_id)`, (err) => {
            if (err) {
              console.error('Erro ao criar índice tipo_despesa_id:', err.message);
            }
          });
        }
      }
    });

    // 5. Verificar e adicionar coluna 'categoria_produto' (Comida, Bebida, Outros)
    db.all(`PRAGMA table_info(faturamento)`, (err, columns) => {
      if (err) {
        console.error('Erro ao verificar schema:', err.message);
        return;
      }

      const hasCategoriaProduto = columns && columns.some(col => col.name === 'categoria_produto');
      if (!hasCategoriaProduto) {
        console.log('⚠️  Coluna "categoria_produto" não existe, adicionando...');
        db.run(`ALTER TABLE faturamento ADD COLUMN categoria_produto VARCHAR(50) DEFAULT 'Comida'`, (err) => {
          if (err) {
            console.error('Erro ao adicionar coluna categoria_produto:', err.message);
          } else {
            console.log('✅ Coluna "categoria_produto" adicionada com sucesso');
            db.run(`CREATE INDEX IF NOT EXISTS idx_categoria_produto ON faturamento(categoria_produto)`);
          }
        });
      } else {
        db.run(`CREATE INDEX IF NOT EXISTS idx_categoria_produto ON faturamento(categoria_produto)`, (err) => {
          if (err) {
            console.error('Erro ao criar índice categoria_produto:', err.message);
          }
        });
      }
    });
  }, 500);
}

// Inserir restaurantes padrão (canais KAIA)
function insertDefaultRestaurantes() {
  const restaurantes = [
    { nome: 'KAIA - Salão', canal: 'Salão' },
    { nome: 'KAIA - iFood', canal: 'iFood' },
    { nome: 'KAIA - Keeta', canal: 'Keeta' },
    { nome: 'KAIA - 99Food', canal: '99Food' }
  ];

  restaurantes.forEach(rest => {
    db.run(
      `INSERT OR IGNORE INTO restaurantes (nome, canal, ativa)
       VALUES (?, ?, 1)`,
      [rest.nome, rest.canal],
      (err) => {
        if (err) {
          console.error(`Erro ao inserir restaurante ${rest.nome}:`, err.message);
        }
      }
    );
  });
}

// Inserir tipos de despesa padrão
function insertDefaultTiposDespesa() {
  const tiposDespesa = [
    // CMV
    { classificacao: 'CMV', subcategoria: 'Hortifruti', descricao: 'Vegetais e frutas' },
    { classificacao: 'CMV', subcategoria: 'Padaria', descricao: 'Pão, massas e derivados' },
    { classificacao: 'CMV', subcategoria: 'Óleo', descricao: 'Óleos e gorduras' },
    { classificacao: 'CMV', subcategoria: 'Batata', descricao: 'Batatas e tubérculos' },
    { classificacao: 'CMV', subcategoria: 'Carne', descricao: 'Carnes, peixes e proteínas' },
    { classificacao: 'CMV', subcategoria: 'Embalagem', descricao: 'Embalagens e descartáveis' },
    // Operacional
    { classificacao: 'Operacional', subcategoria: 'Aluguel', descricao: 'Aluguel do estabelecimento' },
    { classificacao: 'Operacional', subcategoria: 'Utilidades', descricao: 'Água, luz, gás' },
    { classificacao: 'Operacional', subcategoria: 'Limpeza', descricao: 'Materiais de limpeza' },
    { classificacao: 'Operacional', subcategoria: 'Manutenção', descricao: 'Manutenção e reparos' },
    // Administrativa
    { classificacao: 'Administrativa', subcategoria: 'Impostos', descricao: 'Impostos e taxas' },
    { classificacao: 'Administrativa', subcategoria: 'Pessoal', descricao: 'Salários e encargos' },
    { classificacao: 'Administrativa', subcategoria: 'Software', descricao: 'Ferramentas e sistemas' },
    // Financeira
    { classificacao: 'Financeira', subcategoria: 'Juros', descricao: 'Juros e multas' },
    { classificacao: 'Financeira', subcategoria: 'Taxas', descricao: 'Taxas bancárias e plataformas' }
  ];

  tiposDespesa.forEach(tipo => {
    db.run(
      `INSERT OR IGNORE INTO tipo_despesa (classificacao, subcategoria, descricao, ativa)
       VALUES (?, ?, ?, 1)`,
      [tipo.classificacao, tipo.subcategoria, tipo.descricao],
      (err) => {
        if (err) {
          console.error(`Erro ao inserir tipo_despesa ${tipo.subcategoria}:`, err.message);
        }
      }
    );
  });
}

// Função para usar o database
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Função para queries de leitura
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Função para queries que retornam múltiplas linhas
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  runAsync,
  getAsync,
  allAsync
};
