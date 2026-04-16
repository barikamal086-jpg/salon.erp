const { runAsync, getAsync, allAsync } = require('../database');

class NotaFiscal {
  // Obter todas as notas fiscais pendentes
  static async obterPendentes() {
    const sql = `
      SELECT *
      FROM notas_fiscais
      WHERE status = 'pendente'
      ORDER BY created_at DESC
    `;
    return await allAsync(sql);
  }

  // Obter todas as notas fiscais com paginação
  static async listar(status = null, limit = 50, offset = 0) {
    let sql = 'SELECT * FROM notas_fiscais';
    const params = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await allAsync(sql, params);
  }

  // Obter uma nota fiscal específica
  static async obter(id) {
    const sql = `
      SELECT *
      FROM notas_fiscais
      WHERE id = ?
    `;
    return await getAsync(sql, [id]);
  }

  // Obter nota fiscal por número
  static async obterPorNumero(numeroNF) {
    const sql = `
      SELECT *
      FROM notas_fiscais
      WHERE numero_nf = ?
    `;
    return await getAsync(sql, [numeroNF]);
  }

  // Criar nova nota fiscal
  static async criar(dados) {
    const {
      numero_nf,
      fornecedor_nome,
      fornecedor_cnpj,
      data_emissao,
      data_vencimento,
      valor_total,
      descricao,
      classificacao_sugerida,
      xml_content,
      pdf_filename
    } = dados;

    const sql = `
      INSERT INTO notas_fiscais (
        numero_nf,
        fornecedor_nome,
        fornecedor_cnpj,
        data_emissao,
        data_vencimento,
        valor_total,
        descricao,
        classificacao_sugerida,
        xml_content,
        pdf_filename,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
    `;

    return await runAsync(sql, [
      numero_nf,
      fornecedor_nome,
      fornecedor_cnpj,
      data_emissao,
      data_vencimento,
      valor_total,
      descricao,
      classificacao_sugerida,
      xml_content,
      pdf_filename
    ]);
  }

  // Atualizar nota fiscal
  static async atualizar(id, dados) {
    const {
      tipo_despesa_id,
      classificacao_sugerida,
      status
    } = dados;

    const sql = `
      UPDATE notas_fiscais
      SET tipo_despesa_id = ?, classificacao_sugerida = ?, status = ?
      WHERE id = ?
    `;

    return await runAsync(sql, [tipo_despesa_id, classificacao_sugerida, status, id]);
  }

  // Processar nota fiscal (criar faturamento associado)
  static async processar(id, faturamento_id, tipo_despesa_id) {
    const sql = `
      UPDATE notas_fiscais
      SET status = 'processado',
          processado_em = CURRENT_TIMESTAMP,
          tipo_despesa_id = ?,
          faturamento_id = ?
      WHERE id = ?
    `;

    return await runAsync(sql, [tipo_despesa_id, faturamento_id, id]);
  }

  // Obter estatísticas
  static async obterEstatisticas() {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN status = 'processado' THEN 1 ELSE 0 END) as processadas,
        SUM(valor_total) as valor_total
      FROM notas_fiscais
    `;

    return await getAsync(sql);
  }
}

module.exports = NotaFiscal;
