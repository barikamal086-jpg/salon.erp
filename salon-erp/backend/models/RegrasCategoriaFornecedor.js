const { pool } = require('../database');

class RegrasCategoriaFornecedor {
  // Criar tabela se não existir
  static async inicializar() {
    try {
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

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_regra_fornecedor 
        ON regras_categoria_fornecedor(LOWER(fornecedor_nome))
      `);

      console.log('✅ Tabela regras_categoria_fornecedor criada/verificada');
    } catch (error) {
      console.error('❌ Erro ao criar tabela:', error.message);
      throw error;
    }
  }

  // Cadastrar regra
  static async criar(fornecedorNome, tipoDespesaId) {
    try {
      const result = await pool.query(`
        INSERT INTO regras_categoria_fornecedor (fornecedor_nome, tipo_despesa_id, ativo)
        VALUES ($1, $2, true)
        ON CONFLICT (fornecedor_nome) 
        DO UPDATE SET tipo_despesa_id = $2, updated_at = NOW()
        RETURNING *
      `, [fornecedorNome.trim(), tipoDespesaId]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Erro ao criar regra:', error.message);
      throw error;
    }
  }

  // Obter regra por fornecedor
  static async obterPorFornecedor(fornecedorNome) {
    try {
      const result = await pool.query(`
        SELECT r.*, td.subcategoria, td.classificacao
        FROM regras_categoria_fornecedor r
        LEFT JOIN tipo_despesa td ON r.tipo_despesa_id = td.id
        WHERE LOWER(r.fornecedor_nome) = LOWER($1)
        AND r.ativo = true
        LIMIT 1
      `, [fornecedorNome.trim()]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Erro ao obter regra:', error.message);
      return null;
    }
  }

  // Listar todas as regras
  static async listar() {
    try {
      const result = await pool.query(`
        SELECT r.*, td.subcategoria, td.classificacao
        FROM regras_categoria_fornecedor r
        LEFT JOIN tipo_despesa td ON r.tipo_despesa_id = td.id
        WHERE r.ativo = true
        ORDER BY r.fornecedor_nome ASC
      `);

      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao listar regras:', error.message);
      return [];
    }
  }

  // Deletar regra
  static async deletar(id) {
    try {
      await pool.query(`
        DELETE FROM regras_categoria_fornecedor
        WHERE id = $1
      `, [id]);

      console.log(`✅ Regra ${id} deletada`);
    } catch (error) {
      console.error('❌ Erro ao deletar regra:', error.message);
      throw error;
    }
  }

  // Atualizar regra
  static async atualizar(id, tipoDespesaId) {
    try {
      const result = await pool.query(`
        UPDATE regras_categoria_fornecedor
        SET tipo_despesa_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [tipoDespesaId, id]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar regra:', error.message);
      throw error;
    }
  }
}

module.exports = RegrasCategoriaFornecedor;
