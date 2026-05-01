const { runAsync, getAsync, allAsync } = require('../database');

class TipoDespesa {
  // Obter todos os tipos de despesa agrupados por classificação
  static async obterTodos() {
    const sql = `
      SELECT id, classificacao, subcategoria, descricao
      FROM tipo_despesa
      WHERE ativa = true
      ORDER BY classificacao, subcategoria
    `;
    return await allAsync(sql);
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
      WHERE classificacao = 'CMV' AND ativa = true
      ORDER BY subcategoria
    `;
    return await allAsync(sql);
  }

  // Obter um tipo específico
  static async obter(id) {
    const sql = `
      SELECT *
      FROM tipo_despesa
      WHERE id = ? AND ativa = true
    `;
    return await getAsync(sql, [id]);
  }

  // Criar novo tipo de despesa
  static async criar(classificacao, subcategoria, descricao) {
    const sql = `
      INSERT INTO tipo_despesa (classificacao, subcategoria, descricao, ativa)
      VALUES (?, ?, ?, true)
    `;
    return await runAsync(sql, [classificacao, subcategoria, descricao]);
  }

  // Atualizar tipo de despesa
  static async atualizar(id, classificacao, subcategoria, descricao) {
    const sql = `
      UPDATE tipo_despesa
      SET classificacao = ?, subcategoria = ?, descricao = ?
      WHERE id = ?
    `;
    return await runAsync(sql, [classificacao, subcategoria, descricao, id]);
  }

  // Desativar tipo de despesa
  static async desativar(id) {
    const sql = `
      UPDATE tipo_despesa
      SET ativa = false
      WHERE id = ?
    `;
    return await runAsync(sql, [id]);
  }

  // Verificar se existe categoria por classificação e subcategoria
  static async obterPorSubcategoria(classificacao, subcategoria) {
    const sql = `
      SELECT id, classificacao, subcategoria, descricao
      FROM tipo_despesa
      WHERE classificacao = ? AND subcategoria = ? AND ativa = true
      LIMIT 1
    `;
    return await getAsync(sql, [classificacao, subcategoria]);
  }
}

module.exports = TipoDespesa;
