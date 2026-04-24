const { runAsync, getAsync, allAsync } = require('../database');

class Faturamento {
  // Listar faturamentos (últimos N dias, opcionalmente filtrar por status e/ou categoria)
  static async listar(days = 30, status = null, categoria = null) {
    let sql = `
      SELECT * FROM faturamento
      WHERE data >= date('now', '-${days} days')
    `;
    let params = [];

    if (categoria !== null && categoria !== undefined && categoria !== '') {
      sql += ` AND categoria = ?`;
      params.push(categoria);
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

  // Atualizar faturamento completo (data, total, categoria, tipo, tipo_despesa_id)
  static async atualizarCompleto(id, data, total, categoria, tipo, tipoDespesaId = null) {
    // Validações
    if (!data || !total || !categoria) {
      throw new Error('Data, Total e Categoria são obrigatórios');
    }

    if (total <= 0) {
      throw new Error('Total deve ser maior que zero');
    }

    if (!['receita', 'despesa'].includes(tipo)) {
      throw new Error('Tipo deve ser "receita" ou "despesa"');
    }

    const sql = `
      UPDATE faturamento
      SET data = ?, total = ?, categoria = ?, tipo = ?, tipo_despesa_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    return await runAsync(sql, [data, parseFloat(total), categoria, tipo, tipoDespesaId, id]);
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
  static async obterStats(dataInicio, dataFim, categoria = null) {
    let sql = `
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
    let params = [dataInicio, dataFim];

    if (categoria !== null && categoria !== undefined && categoria !== '') {
      sql += ` AND categoria = ?`;
      params.push(categoria);
    }

    return await getAsync(sql, params);
  }

  // Obter dados para gráfico (receitas e despesas separadas por dia)
  static async obterDadosGrafico(dataInicio, dataFim, categoria = null) {
    let sql = `
      SELECT
        data,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as receita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as despesa
      FROM faturamento
      WHERE data >= ? AND data <= ?
    `;
    let params = [dataInicio, dataFim];

    if (categoria !== null && categoria !== undefined && categoria !== '') {
      sql += ` AND categoria = ?`;
      params.push(categoria);
    }

    sql += ` GROUP BY data ORDER BY data ASC`;

    return await allAsync(sql, params);
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
        NULLIF(CAST((julianday(?) - julianday(?)) AS INTEGER) + 1, 0) as mediaReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) /
        NULLIF(CAST((julianday(?) - julianday(?)) AS INTEGER) + 1, 0) as mediaDespesa,
        COALESCE(MAX(CASE WHEN tipo = 'receita' THEN total ELSE NULL END), 0) as maiorReceita,
        COALESCE(MAX(CASE WHEN tipo = 'despesa' THEN total ELSE NULL END), 0) as maiorDespesa,
        CAST((julianday(?) - julianday(?)) AS INTEGER) + 1 as dias,
        COUNT(DISTINCT CASE WHEN tipo = 'receita' THEN data ELSE NULL END) as diasReceita,
        COUNT(DISTINCT CASE WHEN tipo = 'despesa' THEN data ELSE NULL END) as diasDespesa,
        COUNT(*) as totalEntradas
      FROM faturamento
      WHERE data >= ? AND data <= ? AND categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
      GROUP BY categoria
      ORDER BY totalLiquido DESC
    `;
    return await allAsync(sql, [dataFim, dataInicio, dataFim, dataInicio, dataFim, dataInicio, dataInicio, dataFim]);
  }

  // Obter despesas separadas em Taxas (específicas) e Despesas Alocadas (compartilhadas)
  static async obterDespesasAlocadas(dataInicio, dataFim) {
    // 1. Obter receitas e taxas reais (específicas de cada categoria)
    const sql = `
      SELECT
        categoria,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalTaxasReais
      FROM faturamento
      WHERE data >= ? AND data <= ? AND categoria IN ('Salão', 'iFood', '99Food', 'Keeta')
      GROUP BY categoria
    `;

    const stats = await allAsync(sql, [dataInicio, dataFim]);

    // 2. Calcular receita total
    const totalReceitaGeral = stats.reduce((sum, s) => sum + parseFloat(s.totalReceita || 0), 0);

    // 3. Obter despesas totais apenas do Salão (para alocar proporcionalmente)
    const despesaSalaoQuery = `
      SELECT COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa
      FROM faturamento
      WHERE data >= ? AND data <= ? AND categoria = 'Salão'
    `;
    const despesaSalao = await getAsync(despesaSalaoQuery, [dataInicio, dataFim]);
    const totalDespesaSalao = parseFloat(despesaSalao.totalDespesa || 0);

    // 4. Alocar despesas do Salão proporcionalmente à receita de cada categoria
    const resultado = stats.map(s => {
      const receita = parseFloat(s.totalReceita || 0);
      const taxasReais = parseFloat(s.totalTaxasReais || 0);
      const proporcao = totalReceitaGeral > 0 ? receita / totalReceitaGeral : 0;

      // Salão não recebe despesas alocadas (já tem suas despesas reais)
      // Outras categorias recebem proporção das despesas do Salão
      const despesaAlocada = s.categoria === 'Salão' ? 0 : (totalDespesaSalao * proporcao);
      const despesaTotal = taxasReais + despesaAlocada;

      return {
        categoria: s.categoria,
        totalReceita: receita,
        totalTaxas: taxasReais,
        totalDespesasAlocadas: despesaAlocada,
        totalDespesa: despesaTotal,
        totalLiquido: receita - despesaTotal,
        proporcao: (proporcao * 100).toFixed(2)
      };
    });

    return resultado;
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
  static async obterDadosCMV(dataInicio, dataFim, categoria = null) {
    // Dados principais (período atual)
    const stats = await this.obterStats(dataInicio, dataFim, categoria);
    const cmvDetalhado = await this.obterRelatorioCMV(dataInicio, dataFim, categoria);
    const cmvTotal = await this.obterTotalCMV(dataInicio, dataFim, categoria);
    const dadosGrafico = await this.obterDadosGrafico(dataInicio, dataFim, categoria);

    // Obter despesas alocadas com separação entre taxas e despesas compartilhadas
    const despesasAlocadas = await this.obterDespesasAlocadas(dataInicio, dataFim);

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
      statsPeriodoAnterior = await this.obterStats(dataAnteriorInicioStr, dataAnteriorFimStr, categoria);
      cmvTotalAnterior = await this.obterTotalCMV(dataAnteriorInicioStr, dataAnteriorFimStr, categoria);
    } catch (e) {
      console.log('ℹ️ Período anterior sem dados (esperado para períodos antigos)');
    }

    // Calcular taxas reais primeiro (necessário para receita líquida)
    let totalTaxasReais = 0;
    if (despesasAlocadas && despesasAlocadas.length > 0) {
      if (categoria) {
        const despesaCategoria = despesasAlocadas.find(d => d.categoria === categoria);
        if (despesaCategoria) {
          totalTaxasReais = parseFloat(despesaCategoria.totalTaxas || 0);
        }
      } else {
        totalTaxasReais = despesasAlocadas.reduce((sum, d) => {
          return sum + parseFloat(d.totalTaxas || 0);
        }, 0);
      }
    }

    // Calcular CMV % (CMV / Receita Líquida)
    const totalReceita = parseFloat(stats.totalReceita || 0);
    const totalCMV = parseFloat(cmvTotal.totalCMV || 0);
    const receitaLiquida = totalReceita - totalTaxasReais;
    const cmvPercentual = receitaLiquida > 0 ? (totalCMV / receitaLiquida) * 100 : 0;

    // Calcular margem bruta (Receita Líquida - CMV) / Receita Líquida
    const margem = receitaLiquida > 0 ? ((receitaLiquida - totalCMV) / receitaLiquida) * 100 : 0;

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

    // Calcular faturamento líquido como Receita Líquida - CMV (apenas CMV, não todas despesas)
    const totalLiquidoCMV = receitaLiquida - totalCMV;

    return {
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
        dias: stats.dias || 0
      },
      resumo: {
        totalReceita: parseFloat(stats.totalReceita || 0),
        totalCMV: parseFloat(cmvTotal.totalCMV || 0),
        totalLiquido: parseFloat(totalLiquidoCMV.toFixed(2)),
        cmvPercentual: parseFloat(cmvPercentual.toFixed(2)),
        margemBruta: parseFloat(margem.toFixed(2)),
        variacao: parseFloat(variacao.toFixed(2)),
        cmvPercentualAnterior: parseFloat(cmvPercentualAnterior.toFixed(2)),
        totalTaxasReais: totalTaxasReais
      },
      despesasAlocadas: despesasAlocadas,
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

  // Obter relatório CMV separado por subcategoria (com alocação proporcional se categoria especificada)
  static async obterRelatorioCMV(dataInicio, dataFim, categoria = null) {
    // Se categoria especificada, calcular percentual de receita para alocação
    let percentualReceita = 1; // padrão: 100%

    if (categoria !== null && categoria !== undefined && categoria !== '') {
      // 1. Obter receita total do período (todas categorias)
      const totalReceitaSql = `
        SELECT COALESCE(SUM(total), 0) as totalReceita
        FROM faturamento
        WHERE data >= ? AND data <= ? AND tipo = 'receita'
      `;
      const totalReceitaResult = await getAsync(totalReceitaSql, [dataInicio, dataFim]);
      const totalReceita = parseFloat(totalReceitaResult.totalReceita || 0);

      // 2. Obter receita da categoria específica
      const receitaCategoriaSql = `
        SELECT COALESCE(SUM(total), 0) as receitaCategoria
        FROM faturamento
        WHERE data >= ? AND data <= ? AND tipo = 'receita' AND categoria = ?
      `;
      const receitaCategoriaResult = await getAsync(receitaCategoriaSql, [dataInicio, dataFim, categoria]);
      const receitaCategoria = parseFloat(receitaCategoriaResult.receitaCategoria || 0);

      // 3. Calcular percentual de receita dessa categoria
      percentualReceita = totalReceita > 0 ? receitaCategoria / totalReceita : 0;
    }

    let sql = `
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
    let params = [dataInicio, dataFim];

    const resultados = await allAsync(sql, params);

    // Alocar proporcionalmente se categoria especificada
    if (categoria !== null && categoria !== undefined && categoria !== '' && percentualReceita < 1) {
      return resultados.map(item => ({
        ...item,
        total: item.total * percentualReceita,
        media: item.media * percentualReceita,
        maior: item.maior * percentualReceita,
        menor: item.menor * percentualReceita
      }));
    }

    return resultados;
  }

  // Obter totais de CMV (com alocação proporcional se categoria especificada)
  static async obterTotalCMV(dataInicio, dataFim, categoria = null) {
    // Se categoria especificada, fazer alocação proporcional
    if (categoria !== null && categoria !== undefined && categoria !== '') {
      // 1. Obter receita total do período (todas categorias)
      const totalReceitaSql = `
        SELECT COALESCE(SUM(total), 0) as totalReceita
        FROM faturamento
        WHERE data >= ? AND data <= ? AND tipo = 'receita'
      `;
      const totalReceitaResult = await getAsync(totalReceitaSql, [dataInicio, dataFim]);
      const totalReceita = parseFloat(totalReceitaResult.totalReceita || 0);

      // 2. Obter receita da categoria específica
      const receitaCategoriaSql = `
        SELECT COALESCE(SUM(total), 0) as receitaCategoria
        FROM faturamento
        WHERE data >= ? AND data <= ? AND tipo = 'receita' AND categoria = ?
      `;
      const receitaCategoriaResult = await getAsync(receitaCategoriaSql, [dataInicio, dataFim, categoria]);
      const receitaCategoria = parseFloat(receitaCategoriaResult.receitaCategoria || 0);

      // 3. Calcular percentual de receita dessa categoria
      const percentualReceita = totalReceita > 0 ? receitaCategoria / totalReceita : 0;

      // 4. Obter CMV total (sem filtro de categoria, pois CMV não tem categoria)
      const cmvTotalSql = `
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
      const cmvResult = await getAsync(cmvTotalSql, [dataInicio, dataFim]);

      // 5. Alocar proporcionalmente
      const totalCMV = parseFloat(cmvResult.totalCMV || 0);
      const cmvAlocado = totalCMV * percentualReceita;

      return {
        totalCMV: cmvAlocado,
        mediaCMV: parseFloat(cmvResult.mediaCMV || 0),
        maiorCMV: parseFloat(cmvResult.maiorCMV || 0),
        menorCMV: parseFloat(cmvResult.menorCMV || 0),
        quantidadeCMV: cmvResult.quantidadeCMV || 0,
        diasComCMV: cmvResult.diasComCMV || 0,
        _proporcionalInfo: {
          receitaCategoria: receitaCategoria,
          receitaTotal: totalReceita,
          percentualReceitaCategoria: parseFloat((percentualReceita * 100).toFixed(2)),
          cmvTotal: totalCMV,
          cmvAlocado: cmvAlocado
        }
      };
    }

    // Se sem categoria, retornar CMV total normal
    let sql = `
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
    const result = await getAsync(sql, [dataInicio, dataFim]);

    return {
      totalCMV: parseFloat(result.totalCMV || 0),
      mediaCMV: parseFloat(result.mediaCMV || 0),
      maiorCMV: parseFloat(result.maiorCMV || 0),
      menorCMV: parseFloat(result.menorCMV || 0),
      quantidadeCMV: result.quantidadeCMV || 0,
      diasComCMV: result.diasComCMV || 0
    };
  }

  // Auditoria: Obter todas as despesas de CMV detalhadas
  static async obterDespesasCMVDetalhadas(dataInicio, dataFim) {
    const sql = `
      SELECT
        f.id,
        f.data,
        f.total,
        td.subcategoria,
        td.classificacao,
        f.categoria,
        f.tipo,
        nf.fornecedor_nome,
        nf.numero_nf,
        f.created_at,
        f.updated_at
      FROM faturamento f
      LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
      LEFT JOIN notas_fiscais nf ON f.id = nf.faturamento_id
      WHERE f.data >= ? AND f.data <= ?
        AND td.classificacao = 'CMV'
        AND f.tipo = 'despesa'
      ORDER BY f.data DESC, f.total DESC
    `;

    const despesas = await allAsync(sql, [dataInicio, dataFim]);

    // Agregar por subcategoria
    const porSubcategoria = {};
    let totalGeral = 0;
    let qtdTotal = 0;

    despesas.forEach(despesa => {
      const subcategoria = despesa.subcategoria || 'Sem categoria';

      if (!porSubcategoria[subcategoria]) {
        porSubcategoria[subcategoria] = {
          subcategoria: subcategoria,
          total: 0,
          quantidade: 0,
          despesas: []
        };
      }

      porSubcategoria[subcategoria].total += parseFloat(despesa.total || 0);
      porSubcategoria[subcategoria].quantidade += 1;
      porSubcategoria[subcategoria].despesas.push({
        id: despesa.id,
        data: despesa.data,
        total: parseFloat(despesa.total || 0),
        fornecedor: despesa.fornecedor_nome || 'Sem fornecedor',
        numeroNF: despesa.numero_nf || 'N/A',
        categoria: despesa.categoria || 'N/A',
        criadoEm: despesa.created_at
      });

      totalGeral += parseFloat(despesa.total || 0);
      qtdTotal += 1;
    });

    return {
      periodo: {
        inicio: dataInicio,
        fim: dataFim
      },
      resumo: {
        totalCMV: parseFloat(totalGeral.toFixed(2)),
        quantidadeDespesas: qtdTotal,
        subcategorias: Object.keys(porSubcategoria).length
      },
      porSubcategoria: Object.values(porSubcategoria).map(item => ({
        ...item,
        total: parseFloat(item.total.toFixed(2)),
        media: parseFloat((item.total / item.quantidade).toFixed(2))
      })),
      despesasDetalhadas: despesas.map(d => ({
        ...d,
        total: parseFloat(d.total || 0)
      }))
    };
  }
}

module.exports = Faturamento;
