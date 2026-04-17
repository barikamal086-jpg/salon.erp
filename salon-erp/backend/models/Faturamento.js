const { runAsync, getAsync, allAsync } = require('../database');

class Faturamento {
  // Listar faturamentos (últimos N dias, opcionalmente filtrar por status)
  static async listar(days = 30, status = null) {
    let sql = `
      SELECT * FROM faturamento
      WHERE data >= date('now', '-${days} days')
    `;
    let params = [];

    if (status !== null) {
      if (status === 'pending') {
        sql += ` AND status = 0`;
      } else if (status === 'sent') {
        sql += ` AND status = 1`;
      }
    }

    sql += ` ORDER BY data DESC`;

    return await allAsync(sql, params);
  }

  // Obter um faturamento específico
  static async obter(id) {
    const sql = `SELECT * FROM faturamento WHERE id = ?`;
    return await getAsync(sql, [id]);
  }

  // Criar novo faturamento (receita ou despesa)
  static async criar(data, total, categoria = 'Salão', tipo = 'receita', tipoDespesaId = null) {
    // Validar total > 0
    if (total <= 0) {
      throw new Error('Total deve ser maior que zero');
    }

    // Validar categoria
    if (!categoria || categoria.trim() === '') {
      throw new Error('Categoria é obrigatória');
    }

    // Validar tipo
    if (!['receita', 'despesa'].includes(tipo)) {
      throw new Error('Tipo deve ser "receita" ou "despesa"');
    }

    // Se for despesa, tipo_despesa_id é obrigatório
    if (tipo === 'despesa' && !tipoDespesaId) {
      throw new Error('tipo_despesa_id é obrigatório para despesas');
    }

    const sql = `
      INSERT INTO faturamento (data, total, categoria, tipo, tipo_despesa_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `;
    return await runAsync(sql, [data, parseFloat(total), categoria.trim(), tipo, tipoDespesaId]);
  }

  // Atualizar faturamento (apenas total)
  static async atualizar(id, total) {
    // Validar total > 0
    if (total <= 0) {
      throw new Error('Total deve ser maior que zero');
    }

    const sql = `
      UPDATE faturamento
      SET total = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    return await runAsync(sql, [parseFloat(total), id]);
  }

  // Deletar faturamento
  static async deletar(id) {
    const sql = `DELETE FROM faturamento WHERE id = ?`;
    return await runAsync(sql, [id]);
  }

  // Marcar como enviado ao Conta Azul
  static async marcarEnviado(id) {
    const sql = `
      UPDATE faturamento
      SET status = 1, enviado_em = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `;
    return await runAsync(sql, [id]);
  }

  // Obter estatísticas (KPIs) para um período (receitas e despesas separadas)
  static async obterStats(dataInicio, dataFim) {
    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalLiquido,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) /
        NULLIF(COUNT(DISTINCT data), 0) as mediaReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) /
        NULLIF(COUNT(DISTINCT data), 0) as mediaDespesa,
        COALESCE(MAX(CASE WHEN tipo = 'receita' THEN total ELSE NULL END), 0) as maiorReceita,
        COALESCE(MAX(CASE WHEN tipo = 'despesa' THEN total ELSE NULL END), 0) as maiorDespesa,
        COALESCE(MIN(CASE WHEN tipo = 'receita' THEN total ELSE NULL END), 0) as menorReceita,
        COALESCE(MIN(CASE WHEN tipo = 'despesa' THEN total ELSE NULL END), 0) as menorDespesa,
        COUNT(DISTINCT data) as dias,
        COUNT(*) as totalEntradas
      FROM faturamento
      WHERE data >= ? AND data <= ?
    `;
    return await getAsync(sql, [dataInicio, dataFim]);
  }

  // Obter dados para gráfico (receitas e despesas separadas por dia)
  static async obterDadosGrafico(dataInicio, dataFim) {
    const sql = `
      SELECT
        data,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as receita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as despesa
      FROM faturamento
      WHERE data >= ? AND data <= ?
      GROUP BY data
      ORDER BY data ASC
    `;
    return await allAsync(sql, [dataInicio, dataFim]);
  }

  // Obter estatísticas separadas por categoria (receitas e despesas)
  static async obterStatsPorCategoria(dataInicio, dataFim) {
    const sql = `
      SELECT
        categoria,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalLiquido,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) /
        NULLIF(COUNT(DISTINCT CASE WHEN tipo = 'receita' THEN data ELSE NULL END), 0) as mediaReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) /
        NULLIF(COUNT(DISTINCT CASE WHEN tipo = 'despesa' THEN data ELSE NULL END), 0) as mediaDespesa,
        COALESCE(MAX(CASE WHEN tipo = 'receita' THEN total ELSE NULL END), 0) as maiorReceita,
        COALESCE(MAX(CASE WHEN tipo = 'despesa' THEN total ELSE NULL END), 0) as maiorDespesa,
        COUNT(DISTINCT data) as dias,
        COUNT(DISTINCT CASE WHEN tipo = 'receita' THEN data ELSE NULL END) as diasReceita,
        COUNT(DISTINCT CASE WHEN tipo = 'despesa' THEN data ELSE NULL END) as diasDespesa,
        COUNT(*) as totalEntradas
      FROM faturamento
      WHERE data >= ? AND data <= ? AND categoria IN ('Salão', 'iFood', '99Food', 'Keepa')
      GROUP BY categoria
      ORDER BY totalLiquido DESC
    `;
    return await allAsync(sql, [dataInicio, dataFim]);
  }

  // DEBUG: Obter dados brutos por categoria (para encontrar discrepâncias)
  static async obterStatsPorCategoriaBruto(dataInicio, dataFim) {
    const sql = `
      SELECT
        COALESCE(categoria, 'NULL') as categoria,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa
      FROM faturamento
      WHERE data >= ? AND data <= ?
      GROUP BY categoria
      ORDER BY totalReceita + totalDespesa DESC
    `;
    return await allAsync(sql, [dataInicio, dataFim]);
  }

  // CMV Inteligente: Obter dados completos para análise de CMV
  static async obterDadosCMV(dataInicio, dataFim) {
    // Dados principais (período atual)
    const stats = await this.obterStats(dataInicio, dataFim);
    const cmvDetalhado = await this.obterRelatorioCMV(dataInicio, dataFim);
    const cmvTotal = await this.obterTotalCMV(dataInicio, dataFim);
    const dadosGrafico = await this.obterDadosGrafico(dataInicio, dataFim);

    // Calcular período anterior (mesma duração) para comparação
    const dataInStart = new Date(dataInicio);
    const dataFimStart = new Date(dataFim);
    const duracao = dataFimStart - dataInStart;

    const dataAnteriorFim = new Date(dataInStart.getTime() - 1);
    const dataAnteriorInicio = new Date(dataAnteriorFim.getTime() - duracao);

    const dataAnteriorInicioStr = dataAnteriorInicio.toISOString().split('T')[0];
    const dataAnteriorFimStr = dataAnteriorFim.toISOString().split('T')[0];

    let statsPeriodoAnterior = null;
    let cmvTotalAnterior = null;
    try {
      statsPeriodoAnterior = await this.obterStats(dataAnteriorInicioStr, dataAnteriorFimStr);
      cmvTotalAnterior = await this.obterTotalCMV(dataAnteriorInicioStr, dataAnteriorFimStr);
    } catch (e) {
      console.log('ℹ️ Período anterior sem dados (esperado para períodos antigos)');
    }

    // Calcular CMV % (CMV / Receita)
    const totalReceita = parseFloat(stats.totalReceita || 0);
    const totalCMV = parseFloat(cmvTotal.totalCMV || 0);
    const cmvPercentual = totalReceita > 0 ? (totalCMV / totalReceita) * 100 : 0;

    // Calcular margem bruta (Receita - CMV) / Receita
    const margem = totalReceita > 0 ? ((totalReceita - totalCMV) / totalReceita) * 100 : 0;

    // Calcular variação em relação ao período anterior
    let variacao = 0;
    let cmvPercentualAnterior = 0;
    if (statsPeriodoAnterior && cmvTotalAnterior) {
      const totalReceitaAnterior = parseFloat(statsPeriodoAnterior.totalReceita || 0);
      const totalCMVAnterior = parseFloat(cmvTotalAnterior.totalCMV || 0);
      cmvPercentualAnterior = totalReceitaAnterior > 0 ? (totalCMVAnterior / totalReceitaAnterior) * 100 : 0;
      variacao = cmvPercentual - cmvPercentualAnterior;
    }

    // Identificar maiores despesas de CMV
    const maiorDespesa = cmvDetalhado.length > 0 ? cmvDetalhado[0] : null;
    const menorDespesa = cmvDetalhado.length > 0 ? cmvDetalhado[cmvDetalhado.length - 1] : null;

    return {
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
        dias: stats.dias || 0
      },
      resumo: {
        totalReceita: parseFloat(stats.totalReceita || 0),
        totalCMV: parseFloat(cmvTotal.totalCMV || 0),
        totalLiquido: parseFloat(stats.totalLiquido || 0),
        cmvPercentual: parseFloat(cmvPercentual.toFixed(2)),
        margemBruta: parseFloat(margem.toFixed(2)),
        variacao: parseFloat(variacao.toFixed(2)),
        cmvPercentualAnterior: parseFloat(cmvPercentualAnterior.toFixed(2))
      },
      cmvDetalhado: cmvDetalhado.map(item => ({
        subcategoria: item.subcategoria || 'Sem categoria',
        total: parseFloat(item.total || 0),
        media: parseFloat(item.media || 0),
        maior: parseFloat(item.maior || 0),
        menor: parseFloat(item.menor || 0),
        quantidade: item.quantidade || 0,
        dias: item.dias || 0,
        percentualReceitaCMV: totalReceita > 0 ? ((parseFloat(item.total || 0) / totalReceita) * 100) : 0
      })),
      maiorDespesa: maiorDespesa ? {
        subcategoria: maiorDespesa.subcategoria || 'Sem categoria',
        total: parseFloat(maiorDespesa.total || 0),
        quantidade: maiorDespesa.quantidade || 0
      } : null,
      menorDespesa: menorDespesa ? {
        subcategoria: menorDespesa.subcategoria || 'Sem categoria',
        total: parseFloat(menorDespesa.total || 0),
        quantidade: menorDespesa.quantidade || 0
      } : null,
      tendencia: dadosGrafico.map(item => ({
        data: item.data,
        receita: parseFloat(item.receita || 0),
        cmv: parseFloat(item.despesa || 0),
        margem: item.receita > 0 ? (((parseFloat(item.receita || 0) - parseFloat(item.despesa || 0)) / parseFloat(item.receita || 0)) * 100) : 0
      }))
    };
  }

  // Obter relatório CMV separado por subcategoria
  static async obterRelatorioCMV(dataInicio, dataFim) {
    const sql = `
      SELECT
        td.subcategoria,
        COALESCE(SUM(f.total), 0) as total,
        COALESCE(AVG(f.total), 0) as media,
        COALESCE(MAX(f.total), 0) as maior,
        COALESCE(MIN(f.total), 0) as menor,
        COUNT(*) as quantidade,
        COUNT(DISTINCT f.data) as dias
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE f.data >= ? AND f.data <= ? AND td.classificacao = 'CMV'
      GROUP BY td.subcategoria
      ORDER BY total DESC
    `;
    return await allAsync(sql, [dataInicio, dataFim]);
  }

  // Obter totais de CMV
  static async obterTotalCMV(dataInicio, dataFim) {
    const sql = `
      SELECT
        COALESCE(SUM(f.total), 0) as totalCMV,
        COALESCE(AVG(f.total), 0) as mediaCMV,
        COALESCE(MAX(f.total), 0) as maiorCMV,
        COALESCE(MIN(f.total), 0) as menorCMV,
        COUNT(*) as quantidadeCMV,
        COUNT(DISTINCT f.data) as diasComCMV
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      WHERE f.data >= ? AND f.data <= ? AND td.classificacao = 'CMV'
    `;
    return await getAsync(sql, [dataInicio, dataFim]);
  }
}

module.exports = Faturamento;
