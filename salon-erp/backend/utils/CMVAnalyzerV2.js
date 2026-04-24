/**
 * CMV Analyzer V2 - Análise inteligente e genérica para restaurantes
 *
 * ARQUITETURA:
 * - 3 Fontes: Sistema Contábil + Cartões + Plataformas
 * - Fórmula: CMV% = CMV Total / Receita Líquida (não Bruta!)
 * - Receita Líquida = RB - Taxas de Plataforma
 * - Detecção automática de duplicidades
 * - Meta configurável por restaurante
 * - Alertas inteligentes
 */

class CMVAnalyzerV2 {
  /**
   * Benchmarks padrão (configuráveis por restaurante)
   */
  static BENCHMARKS_PADRAO = {
    CMV_META: 22,           // % esperado sobre RL
    CMV_ALERTA: 25,         // % acima do qual dispara alerta
    CMV_CRITICO: 30,        // % acima do qual é crítico
    TAXA_PLATAFORMA_META: 20, // % esperado de taxa
    TAXA_PLATAFORMA_ALERTA: 35, // % acima do qual alerta
    JANELA_DUPLICIDADE: 3,  // dias para detectar duplicidade (±3 dias)
    MARGEM_DUPLICIDADE: 0.05, // 5% de margem no valor (R$100 ±5% = R$95-105)
  };

  /**
   * Analisar CMV com arquitetura multi-source
   *
   * @param {Object} dados - Dados mensais estruturados
   *   - mesReferencia: "2026-02"
   *   - restaurante: "KAIA"
   *   - receita: {bruta, taxasiFood, taxa99Food, taxaKeeta, liquida}
   *   - cmv: {sistema, cartaoItau, cartaoBradesco, total}
   *   - cmvPorCategoria: {Carnes, Bebidas, ...}
   *   - compras: [{fornecedor, valor, data, fonte, categoria}]
   *   - benchmarks: {cmvMeta, cmvAlerta, ...} (opcional, usa padrão)
   */
  static analisar(dados, benchmarks = {}) {
    if (!dados || !dados.receita || !dados.cmv) {
      return { erro: 'Dados inválidos' };
    }

    // Mesclar benchmarks (custom + padrão)
    const config = { ...this.BENCHMARKS_PADRAO, ...benchmarks };

    // 1. CALCULAR RECEITA LÍQUIDA
    const receitaLiquida = this.calcularReceitaLiquida(dados.receita);

    // 2. DETECTAR DUPLICIDADES (se compras foram fornecidas)
    let cmvLiquido, duplicidades;
    if (dados.compras && dados.compras.length > 0) {
      const resultado = this.detectarDuplicidades(
        dados.compras,
        config.JANELA_DUPLICIDADE,
        config.MARGEM_DUPLICIDADE
      );
      cmvLiquido = resultado.cmvLiquido;
      duplicidades = resultado.duplicidades;
    } else {
      // Se não houver compras, usar dados.cmv.total como fonte
      cmvLiquido = dados.cmv.total || 0;
      duplicidades = [];
    }

    // 3. CALCULAR CMV%
    const cmvPercentual = receitaLiquida > 0
      ? (cmvLiquido / receitaLiquida) * 100
      : 0;

    // 4. ANALISAR SITUAÇÃO
    const situacao = this.avaliarSituacao(cmvPercentual, config);

    // 5. ANALISAR TAXAS DE PLATAFORMA
    const analiseAxas = this.analisarTaxasPlataforma(dados.receita, config);

    // 6. IDENTIFICAR PROBLEMAS
    const problemas = this.identificarProblemas(
      dados,
      cmvPercentual,
      receitaLiquida,
      duplicidades,
      analiseAxas,
      config
    );

    // 7. GERAR RECOMENDAÇÕES
    const recomendacoes = this.gerarRecomendacoes(problemas, dados, config);

    // 8. ANALISAR POR CATEGORIA
    const porCategoria = this.analisarPorCategoria(dados.cmvPorCategoria, receitaLiquida);

    // 9. ANALISAR FONTES
    const porFonte = this.analisarPorFonte(dados.cmv, receitaLiquida);

    return {
      mes: dados.mesReferencia,
      restaurante: dados.restaurante,
      receita: {
        bruta: dados.receita.bruta,
        taxas: dados.receita.taxas,
        liquida: receitaLiquida,
      },
      cmv: {
        total: cmvLiquido,
        percentualRL: cmvPercentual.toFixed(2),
        meta: config.CMV_META,
        variacao: (cmvPercentual - config.CMV_META).toFixed(2),
      },
      situacao,
      taxasPlataforma: analiseAxas,
      duplicidades: {
        removidas: duplicidades,
        impacto: (dados.cmv.total - cmvLiquido).toFixed(2),
      },
      problemas,
      recomendacoes,
      porCategoria,
      porFonte,
      dataAnalise: new Date().toISOString(),
    };
  }

  /**
   * Calcular Receita Líquida = RB - Taxas
   */
  static calcularReceitaLiquida(receita) {
    return receita.liquida ||
           (receita.bruta - (receita.taxas || 0));
  }

  /**
   * Detectar duplicidades automaticamente
   * Critério: mesmo fornecedor + valor similar + data próxima
   */
  static detectarDuplicidades(compras, janelaEmDias, margemPercentual) {
    const duplicidades = [];
    const comprasUnicas = [];
    const processadas = new Set();

    for (let i = 0; i < compras.length; i++) {
      if (processadas.has(i)) continue;

      const compra1 = compras[i];
      let temDuplicada = false;

      for (let j = i + 1; j < compras.length; j++) {
        if (processadas.has(j)) continue;

        const compra2 = compras[j];

        // Verificar se é duplicidade
        if (this.ehDuplicidade(compra1, compra2, janelaEmDias, margemPercentual)) {
          duplicidades.push({
            fornecedor: compra1.fornecedor,
            valor: compra1.valor,
            fonte1: compra1.fonte,
            data1: compra1.data,
            fonte2: compra2.fonte,
            data2: compra2.data,
            diferenca: Math.abs(compra1.valor - compra2.valor),
          });
          processadas.add(j);
          temDuplicada = true;
        }
      }

      if (!temDuplicada) {
        comprasUnicas.push(compra1);
      }
    }

    const cmvLiquido = comprasUnicas.reduce((sum, c) => sum + c.valor, 0);
    const cmvDuplicado = duplicidades.reduce((sum, d) => sum + d.valor, 0);

    return {
      cmvLiquido,
      cmvDuplicado,
      duplicidades,
    };
  }

  /**
   * Verificar se duas compras são duplicadas
   */
  static ehDuplicidade(compra1, compra2, janelaEmDias, margemPercentual) {
    // Critério 1: Mesmo fornecedor
    if (compra1.fornecedor !== compra2.fornecedor) return false;

    // Critério 2: Valor similar (dentro da margem)
    const margem = compra1.valor * margemPercentual;
    if (Math.abs(compra1.valor - compra2.valor) > margem) return false;

    // Critério 3: Datas próximas (±N dias)
    const data1 = new Date(compra1.data);
    const data2 = new Date(compra2.data);
    const diferençaEmMs = Math.abs(data1 - data2);
    const diferençaEmDias = diferençaEmMs / (1000 * 60 * 60 * 24);

    if (diferençaEmDias > janelaEmDias) return false;

    // Critério 4: Fontes diferentes
    if (compra1.fonte === compra2.fonte) return false;

    return true;
  }

  /**
   * Avaliar situação geral (EXCELENTE, SAUDÁVEL, ALERTA, CRÍTICO)
   */
  static avaliarSituacao(cmvPercentual, config) {
    let status, cor, descricao;

    if (cmvPercentual < config.CMV_META - 3) {
      status = 'EXCELENTE';
      cor = 'green';
      descricao = `CMV ${cmvPercentual.toFixed(1)}% está abaixo da meta (${config.CMV_META}%). Ótima margem!`;
    } else if (cmvPercentual <= config.CMV_META) {
      status = 'SAUDÁVEL';
      cor = 'blue';
      descricao = `CMV ${cmvPercentual.toFixed(1)}% atende a meta (${config.CMV_META}%). Operação sob controle.`;
    } else if (cmvPercentual <= config.CMV_ALERTA) {
      status = 'ALERTA';
      cor = 'yellow';
      descricao = `CMV ${cmvPercentual.toFixed(1)}% acima da meta. Investigar causas.`;
    } else {
      status = 'CRÍTICO';
      cor = 'red';
      descricao = `CMV ${cmvPercentual.toFixed(1)}% CRÍTICO! Ação imediata necessária.`;
    }

    return { status, cor, descricao, cmvPercentual, meta: config.CMV_META };
  }

  /**
   * Analisar taxas de plataforma
   */
  static analisarTaxasPlataforma(receita, config) {
    const taxas = {
      iFood: receita.taxaiFood || 0,
      _99Food: receita.taxa99Food || 0,
      Keeta: receita.taxaKeeta || 0,
    };

    const resultado = {};
    for (const [plataforma, valor] of Object.entries(taxas)) {
      const percentual = receita.bruta > 0 ? (valor / receita.bruta) * 100 : 0;
      resultado[plataforma] = {
        valor,
        percentual: percentual.toFixed(1),
        alerta: percentual > config.TAXA_PLATAFORMA_ALERTA,
      };
    }

    return resultado;
  }

  /**
   * Identificar problemas
   */
  static identificarProblemas(dados, cmvPercentual, rl, duplicidades, taxas, config) {
    const problemas = [];

    // Problema 1: CMV acima da meta
    if (cmvPercentual > config.CMV_META) {
      problemas.push({
        tipo: 'CMV_ACIMA_META',
        severidade: cmvPercentual > config.CMV_ALERTA ? 'CRÍTICO' : 'ALERTA',
        descricao: `CMV ${cmvPercentual.toFixed(1)}% acima da meta ${config.CMV_META}%`,
        impacto: `Perda de margem de ${(cmvPercentual - config.CMV_META).toFixed(1)}%`,
      });
    }

    // Problema 2: Duplicidades detectadas
    if (duplicidades.length > 0) {
      const valorTotal = duplicidades.reduce((sum, d) => sum + d.valor, 0);
      problemas.push({
        tipo: 'DUPLICIDADE_DETECTADA',
        severidade: 'ALERTA',
        descricao: `${duplicidades.length} duplicidade(s) encontrada(s)`,
        impacto: `R$ ${valorTotal.toFixed(2)} contabilizado duplo`,
        detalhes: duplicidades,
      });
    }

    // Problema 3: Taxas de plataforma altas
    for (const [plataforma, dados] of Object.entries(taxas)) {
      if (dados.alerta) {
        problemas.push({
          tipo: 'TAXA_PLATAFORMA_ALTA',
          severidade: 'ALERTA',
          plataforma,
          descricao: `Taxa ${plataforma} em ${dados.percentual}% (limite ${config.TAXA_PLATAFORMA_ALERTA}%)`,
          impacto: `Reduz receita líquida em ${dados.valor.toFixed(2)}`,
        });
      }
    }

    return problemas;
  }

  /**
   * Gerar recomendações baseadas em problemas
   */
  static gerarRecomendacoes(problemas, dados, config) {
    const recomendacoes = [];

    problemas.forEach(p => {
      switch (p.tipo) {
        case 'CMV_ACIMA_META':
          recomendacoes.push({
            prioridade: p.severidade === 'CRÍTICO' ? 'ALTA' : 'MÉDIA',
            acao: 'Auditoria de Custos de Mercadoria',
            detalhes: `Analisar fornecedores de Carnes, Bebidas e Hortifruti (maiores % CMV)`,
            impacto: `Reduzirvem 3% no CMV recupera margem de 3%`,
          });
          break;
        case 'DUPLICIDADE_DETECTADA':
          recomendacoes.push({
            prioridade: 'ALTA',
            acao: 'Revisar Processo de Lançamento',
            detalhes: `Implementar validação para evitar duplas entradas CA + Cartão`,
            impacto: `Eliminar R$ ${(dados.cmv.total - dados.cmv.total * 0.95).toFixed(2)} em erros`,
          });
          break;
        case 'TAXA_PLATAFORMA_ALTA':
          recomendacoes.push({
            prioridade: 'ALTA',
            acao: `Renegociar ${p.plataforma}`,
            detalhes: `Taxa em ${p.descricao} é insustentável. Renegociar para ~20%`,
            impacto: `Cada 1% economizado = 1% a mais em receita líquida`,
          });
          break;
      }
    });

    return recomendacoes;
  }

  /**
   * Analisar CMV por categoria
   */
  static analisarPorCategoria(cmvPorCategoria, rl) {
    if (!cmvPorCategoria) return {};

    const resultado = {};
    for (const [categoria, valor] of Object.entries(cmvPorCategoria)) {
      resultado[categoria] = {
        valor: valor.toFixed(2),
        percentualRL: ((valor / rl) * 100).toFixed(1),
      };
    }
    return resultado;
  }

  /**
   * Analisar CMV por fonte (CA, Itaú, Bradesco)
   */
  static analisarPorFonte(cmv, rl) {
    const resultado = {};
    for (const [fonte, valor] of Object.entries(cmv)) {
      if (fonte !== 'total') {
        resultado[fonte] = {
          valor: valor.toFixed(2),
          percentualRL: ((valor / rl) * 100).toFixed(1),
          percentualCMV: ((valor / cmv.total) * 100).toFixed(1),
        };
      }
    }
    return resultado;
  }

  /**
   * Gerar relatório formatado
   */
  static gerarRelatorio(analise) {
    return `
=== ANÁLISE DE CMV — ${analise.mes} ===

📊 SITUAÇÃO: ${analise.situacao.status}
${analise.situacao.descricao}

💰 RECEITA LÍQUIDA: R$ ${analise.receita.liquida.toFixed(2)}
   (Bruta R$ ${analise.receita.bruta.toFixed(2)} - Taxas R$ ${analise.receita.taxas.toFixed(2)})

🎯 CMV: R$ ${analise.cmv.total.toFixed(2)} = ${analise.cmv.percentualRL}% (meta: ${analise.cmv.meta}%)
   Variação vs meta: ${analise.cmv.variacao > 0 ? '+' : ''}${analise.cmv.variacao}%

⚠️ PROBLEMAS IDENTIFICADOS: ${analise.problemas.length}
${analise.problemas.map(p => `   • ${p.tipo}: ${p.descricao}`).join('\n')}

💡 RECOMENDAÇÕES: ${analise.recomendacoes.length}
${analise.recomendacoes.map(r => `   • [${r.prioridade}] ${r.acao}\n      ${r.detalhes}`).join('\n')}

📍 CMV POR CATEGORIA:
${Object.entries(analise.porCategoria).map(([cat, dados]) =>
  `   • ${cat}: R$ ${dados.valor} (${dados.percentualRL}% da RL)`
).join('\n')}

📋 CMV POR FONTE:
${Object.entries(analise.porFonte).map(([fonte, dados]) =>
  `   • ${fonte}: R$ ${dados.valor} (${dados.percentualRL}% RL, ${dados.percentualCMV}% do CMV)`
).join('\n')}
    `;
  }
}

module.exports = CMVAnalyzerV2;
