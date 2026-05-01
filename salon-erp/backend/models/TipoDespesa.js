const { runAsync, getAsync, allAsync } = require('../database');

class TipoDespesa {
  // Obter todos os tipos de despesa agrupados por classificação
  static async obterTodos() {
    const sql = `
      SELECT id, classificacao, subcategoria, descricao
      FROM tipo_despesa
      WHERE ativa = $1
      ORDER BY classificacao, subcategoria
    `;
    return await allAsync(sql, [true]);
  }

  // Obter tipos agrupados por classificação
  static async obterPorClassificacao() {
    const tipos = await this.obterTodos();
    const agrupado = {};

    tipos.forEach(tipo => {
      if (!agrupado[tipo.classificacao]) {
        agrupado[tipo.classificacao] = [];
      }
      agrupado[tipo.classificacao].push({
        id: tipo.id,
        subcategoria: tipo.subcategoria,
        descricao: tipo.descricao
      });
    });

    return agrupado;
  }

  // Obter subcategorias de CMV
  static async obterCMV() {
    const sql = `
      SELECT id, subcategoria, descricao
      FROM tipo_despesa
      WHERE classificacao = $1 AND ativa = $2
      ORDER BY subcategoria
    `;
    return await allAsync(sql, ['CMV', true]);
  }

  // Obter um tipo específico
  static async obter(id) {
    const sql = `
      SELECT *
      FROM tipo_despesa
      WHERE id = $1 AND ativa = $2
    `;
    return await getAsync(sql, [id, true]);
  }

  // Criar novo tipo de despesa
  static async criar(classificacao, subcategoria, descricao) {
    const sql = `
      INSERT INTO tipo_despesa (classificacao, subcategoria, descricao, ativa)
      VALUES ($1, $2, $3, $4)
    `;
    return await runAsync(sql, [classificacao, subcategoria, descricao, true]);
  }

  // Atualizar tipo de despesa
  static async atualizar(id, classificacao, subcategoria, descricao) {
    const sql = `
      UPDATE tipo_despesa
      SET classificacao = $1, subcategoria = $2, descricao = $3
      WHERE id = $4
    `;
    return await runAsync(sql, [classificacao, subcategoria, descricao, id]);
  }

  // Desativar tipo de despesa
  static async desativar(id) {
    const sql = `
      UPDATE tipo_despesa
      SET ativa = $1
      WHERE id = $2
    `;
    return await runAsync(sql, [false, id]);
  }

  // Verificar se existe categoria por classificação e subcategoria
  static async obterPorSubcategoria(classificacao, subcategoria) {
    const sql = `
      SELECT id, classificacao, subcategoria, descricao
      FROM tipo_despesa
      WHERE classificacao = $1 AND subcategoria = $2 AND ativa = $3
      LIMIT 1
    `;
    return await getAsync(sql, [classificacao, subcategoria, true]);
  }
}

module.exports = TipoDespesa;
