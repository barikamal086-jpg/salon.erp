/**
 * CMV Analyzer - Análise inteligente rule-based sem IA
 * Detecta problemas, tendências, anomalias e gera recomendações
 */

class CMVAnalyzer {
  /**
   * Benchmarks do setor
   */
  static BENCHMARKS = {
    CMV_MINIMO: 20,      // % mínimo esperado
    CMV_IDEAL: 27.5,     // % ideal (meio do range)
    CMV_MAXIMO: 35,      // % máximo aceitável
    MARGEM_MINIMA: 65,   // % mínima de margem esperada
  };

  /**
   * Analisar dados completos de CMV
   */
  static analisar(dadosCMV) {
    if (!dadosCMV || !dadosCMV.resumo) {
      return { erro: 'Dados de CMV inválidos' };
    }

    const situacao = this.avaliarSituacao(dadosCMV);
    const tendencias = this.analisarTendencias(dadosCMV);
    const problemas = this.identificarProblemas(dadosCMV, situacao);
    const recomendacoes = this.gerarRecomendacoes(dadosCMV, problemas);
    const comparacao = this.compararComBenchmark(dadosCMV);
    const subcategoriaAnalise = this.analisarSubcategorias(dadosCMV);

    return {
      situacao,
      tendencias,
      problemas,
      recomendacoes,
      comparacao,
      subcategoriaAnalise,
      dataAnalise: new Date().toISOString()
    };
  }

  /**
   * Avaliar situação geral (Excelente, Saudável, Alerta, Crítica)
   */
  static avaliarSituacao(dadosCMV) {
    const cmv = dadosCMV.resumo.cmvPercentual;
    const margem = dadosCMV.resumo.margemBruta;

    let status;
    let cor;
    let descricao;

    if (cmv < this.BENCHMARKS.CMV_MINIMO) {
      status = 'EXCELENTE';
      cor = 'green';
      descricao = `CMV em ${cmv.toFixed(2)}% está abaixo do esperado. Ótima margem de lucro!`;
    } else if (cmv <= this.BENCHMARKS.CMV_IDEAL) {
      status = 'SAUDÁVEL';
      cor = 'blue';
      descricao = `CMV em ${cmv.toFixed(2)}% está dentro do ideal. Operação equilibrada.`;
    } else if (cmv <= this.BENCHMARKS.CMV_MAXIMO) {
      status = 'ALERTA';
      cor = 'yellow';
      descricao = `CMV em ${cmv.toFixed(2)}% está no limite superior. Atenção necessária.`;
    } else {
      status = 'CRÍTICO';
      cor = 'red';
      descricao = `CMV em ${cmv.toFixed(2)}% está ACIMA do aceitável! Ação imediata recomendada.`;
    }

    return {
      status,
      cor,
      descricao,
      cmvPercentual: cmv,
      margemBruta: margem,
      benchmark: this.BENCHMARKS
    };
  }

  /**
   * Analisar tendências (crescendo, caindo, estável)
   */
  static analisarTendencias(dadosCMV) {
    const tendencia = dadosCMV.tendencia;
    if (!tendencia || tendencia.length < 2) {
      return { status: 'DADOS_INSUFICIENTES', mensagem: 'Necessário mínimo 2 dias de dados' };
    }

    // Calcular variação de CMV % entre primeiro e último dia
    const margensPeriodo = tendencia.map(d => d.margem).filter(m => m !== null && m !== undefined && !isNaN(m));

    if (margensPeriodo.length < 2) {
      return { status: 'SEM_DADOS', mensagem: 'Dados de margem insuficientes' };
    }

    const margensValidas = margensPeriodo.filter(m => m >= -100 && m <= 100); // Filtrar anomalias

    if (margensValidas.length === 0) {
      return { status: 'ANOMALIA', mensagem: 'Dados de margem com anomalias' };
    }

    const margensRecentes = margensValidas.slice(-5); // Últimos 5 dias válidos
    const variacao = margensRecentes[margensRecentes.length - 1] - margensRecentes[0];
    const mediaRecente = margensRecentes.reduce((a, b) => a + b, 0) / margensRecentes.length;

    let tendenciaStatus;
    let emoji;
    let descricao;

    if (variacao > 5) {
      tendenciaStatus = 'MELHORANDO';
      emoji = '📈';
      descricao = `Margem melhorando! Variação de +${variacao.toFixed(2)}% nos últimos dias.`;
    } else if (variacao < -5) {
      tendenciaStatus = 'PIORANDO';
      emoji = '📉';
      descricao = `Margem caindo! Variação de ${variacao.toFixed(2)}% nos últimos dias. Atenção!`;
    } else {
      tendenciaStatus = 'ESTÁVEL';
      emoji = '➡️';
      descricao = `Margem estável em torno de ${mediaRecente.toFixed(2)}%.`;
    }

    return {
      status: tendenciaStatus,
      emoji,
      descricao,
      variacao: variacao.toFixed(2),
      mediaRecente: mediaRecente.toFixed(2),
      diasAnalisados: margensRecentes.length
    };
  }

  /**
   * Identificar problemas específicos
   */
  static identificarProblemas(dadosCMV, situacao) {
    const problemas = [];
    const cmv = dadosCMV.resumo.cmvPercentual;
    const variacao = dadosCMV.resumo.variacao;

    // Problema 1: CMV alto
    if (situacao.status === 'CRÍTICO') {
      problemas.push({
        tipo: 'CMV_ALTO',
        severidade: 'CRÍTICA',
        descricao: `CMV de ${cmv.toFixed(2)}% está muito acima do benchmark (máximo ${this.BENCHMARKS.CMV_MAXIMO}%)`,
        impacto: 'Margem de lucro comprometida',
        emoji: '🔴'
      });
    } else if (situacao.status === 'ALERTA') {
      problemas.push({
        tipo: 'CMV_ELEVADO',
        severidade: 'ALERTA',
        descricao: `CMV de ${cmv.toFixed(2)}% está no limite superior`,
        impacto: 'Pouca margem para aumentos de custo',
        emoji: '🟡'
      });
    }

    // Problema 2: Variação aumentando
    if (variacao > 3) {
      problemas.push({
        tipo: 'VARIACAO_AUMENTANDO',
        severidade: 'AVISO',
        descricao: `CMV aumentou ${variacao.toFixed(2)}% vs período anterior`,
        impacto: 'Tendência de piora nos custos',
        emoji: '⚠️'
      });
    }

    // Problema 3: Subcategoria dominante
    const maiorDespesa = dadosCMV.cmvDetalhado[0];
    if (maiorDespesa && maiorDespesa.percentualReceitaCMV > 5) {
      problemas.push({
        tipo: 'SUBCATEGORIA_DOMINANTE',
        severidade: 'INFO',
        descricao: `${maiorDespesa.subcategoria} representa ${maiorDespesa.percentualReceitaCMV.toFixed(2)}% da receita`,
        impacto: `Maior oportunidade de otimização`,
        subcategoria: maiorDespesa.subcategoria,
        emoji: '📍'
      });
    }

    // Problema 4: Anomalias nos dados
    const comMargemNegativa = dadosCMV.tendencia.filter(d => d.margem < -50);
    if (comMargemNegativa.length > 0) {
      problemas.push({
        tipo: 'ANOMALIA_DADOS',
        severidade: 'ATENÇÃO',
        descricao: `${comMargemNegativa.length} dia(s) com margem negativa (despesa > receita)`,
        impacto: 'Possível erro nos dados ou operação não-lucro',
        emoji: '⚠️'
      });
    }

    return problemas;
  }

  /**
   * Gerar recomendações práticas
   */
  static gerarRecomendacoes(dadosCMV, problemas) {
    const recomendacoes = [];

    // Recomendação 1: Baseada em CMV alto
    if (problemas.some(p => p.tipo === 'CMV_ALTO' || p.tipo === 'CMV_ELEVADO')) {
      recomendacoes.push({
        prioridade: 'ALTA',
        acao: 'Auditoria de Custos',
        detalhes: 'Revisar preços de fornecedores e quantidades de compra',
        impactoEsperado: `Potencial economia de 5-15% no CMV`,
        emoji: '🔍'
      });

      // Específica para a maior despesa
      const maiorDespesa = dadosCMV.cmvDetalhado[0];
      recomendacoes.push({
        prioridade: 'ALTA',
        acao: `Negociar ${maiorDespesa.subcategoria}`,
        detalhes: `Esta categoria representa ${maiorDespesa.percentualReceitaCMV.toFixed(2)}% da receita. Buscar fornecedores alternativos.`,
        impactoEsperado: `Economizar R$ ${(maiorDespesa.total * 0.1).toFixed(2)} (10% de redução)`,
        emoji: '💰'
      });
    }

    // Recomendação 2: Baseada em variação
    const variacao = dadosCMV.resumo.variacao;
    if (variacao > 2) {
      recomendacoes.push({
        prioridade: 'MÉDIA',
        acao: 'Investigar Aumento de Custos',
        detalhes: `CMV aumentou ${variacao.toFixed(2)}% vs período anterior. Identificar causa da variação.`,
        impactoEsperado: 'Controlar escalada de custos',
        emoji: '🔬'
      });
    }

    // Recomendação 3: Baseada em dados bons
    if (dadosCMV.resumo.cmvPercentual < this.BENCHMARKS.CMV_MINIMO) {
      recomendacoes.push({
        prioridade: 'MÉDIA',
        acao: 'Manter Estratégia Atual',
        detalhes: 'Seu CMV está excepcional. Continue com as práticas que funcionam.',
        impactoEsperado: 'Manter margem de lucro saudável',
        emoji: '✅'
      });
    }

    // Recomendação 4: Otimização de inventário
    const totalSubcategorias = dadosCMV.cmvDetalhado.length;
    if (totalSubcategorias > 5) {
      recomendacoes.push({
        prioridade: 'BAIXA',
        acao: 'Consolidar Fornecedores',
        detalhes: `Você tem ${totalSubcategorias} subcategorias de despesa. Considerar consolidação com menos fornecedores.`,
        impactoEsperado: 'Melhor negociação de preços e menos complexidade',
        emoji: '🤝'
      });
    }

    return recomendacoes;
  }

  /**
   * Comparar com benchmark
   */
  static compararComBenchmark(dadosCMV) {
    const cmv = dadosCMV.resumo.cmvPercentual;
    const diferenca = cmv - this.BENCHMARKS.CMV_IDEAL;
    const percentualDiferenca = (diferenca / this.BENCHMARKS.CMV_IDEAL) * 100;

    return {
      cmvAtual: cmv.toFixed(2),
      cmvIdeal: this.BENCHMARKS.CMV_IDEAL,
      diferenca: diferenca.toFixed(2),
      percentualDiferenca: percentualDiferenca.toFixed(2),
      avaliacao: diferenca > 0 ?
        `CMV ${Math.abs(diferenca).toFixed(2)}% ACIMA do ideal` :
        `CMV ${Math.abs(diferenca).toFixed(2)}% ABAIXO do ideal (Excelente!)`,
      impactoMensal: {
        receita: dadosCMV.resumo.totalReceita,
        cmvAtual: dadosCMV.resumo.totalCMV,
        cmvIdeal: (dadosCMV.resumo.totalReceita * this.BENCHMARKS.CMV_IDEAL / 100).toFixed(2),
        diferenca: ((dadosCMV.resumo.totalReceita * diferenca / 100).toFixed(2))
      }
    };
  }

  /**
   * Análise detalhada por subcategoria
   */
  static analisarSubcategorias(dadosCMV) {
    return dadosCMV.cmvDetalhado.map((item, index) => {
      const posicao = index + 1;
      let recomendacao = '';

      if (posicao === 1) {
        recomendacao = '🎯 Foco em negociação - maior impacto';
      } else if (posicao <= 3) {
        recomendacao = '📌 Monitorar regularmente';
      } else if (posicao <= 5) {
        recomendacao = '📊 Acompanhar tendências';
      } else {
        recomendacao = '✓ Sob controle';
      }

      return {
        posicao,
        subcategoria: item.subcategoria,
        total: item.total.toFixed(2),
        percentualReceita: item.percentualReceitaCMV.toFixed(2),
        quantidade: item.quantidade,
        media: item.media.toFixed(2),
        maior: item.maior.toFixed(2),
        menor: item.menor.toFixed(2),
        recomendacao,
        potencialEconomia: (item.total * 0.1).toFixed(2) // 10% de economia potencial
      };
    });
  }

  /**
   * Gerar relatório em texto formatado
   */
  static gerarRelatorio(dadosCMV) {
    const analise = this.analisar(dadosCMV);

    let relatorio = '';
    relatorio += `\n=== ANÁLISE DE CMV ===\n\n`;

    // Situação
    relatorio += `${analise.situacao.emoji || '📊'} SITUAÇÃO: ${analise.situacao.status}\n`;
    relatorio += `${analise.situacao.descricao}\n\n`;

    // Tendência
    relatorio += `${analise.tendencias.emoji} TENDÊNCIA: ${analise.tendencias.status}\n`;
    relatorio += `${analise.tendencias.descricao}\n\n`;

    // Benchmark
    relatorio += `🎯 COMPARAÇÃO COM BENCHMARK\n`;
    relatorio += `CMV Ideal: ${analise.comparacao.cmvIdeal}% | CMV Atual: ${analise.comparacao.cmvAtual}%\n`;
    relatorio += `${analise.comparacao.avaliacao}\n`;
    relatorio += `Impacto: R$ ${analise.comparacao.impactoMensal.diferenca}\n\n`;

    // Problemas
    if (analise.problemas.length > 0) {
      relatorio += `⚠️ PROBLEMAS IDENTIFICADOS\n`;
      analise.problemas.forEach(p => {
        relatorio += `${p.emoji} [${p.severidade}] ${p.tipo}: ${p.descricao}\n`;
      });
      relatorio += '\n';
    }

    // Recomendações
    if (analise.recomendacoes.length > 0) {
      relatorio += `💡 RECOMENDAÇÕES\n`;
      analise.recomendacoes.forEach(r => {
        relatorio += `${r.emoji} [${r.prioridade}] ${r.acao}\n`;
        relatorio += `   ${r.detalhes}\n`;
        relatorio += `   Impacto: ${r.impactoEsperado}\n\n`;
      });
    }

    // Top Subcategorias
    if (analise.subcategoriaAnalise.length > 0) {
      relatorio += `📍 TOP 5 SUBCATEGORIAS DE DESPESA\n`;
      analise.subcategoriaAnalise.slice(0, 5).forEach(s => {
        relatorio += `${s.posicao}. ${s.subcategoria}: R$ ${s.total} (${s.percentualReceita}% da receita)\n`;
        relatorio += `   ${s.recomendacao} | Economia potencial: R$ ${s.potencialEconomia}\n`;
      });
    }

    return relatorio;
  }
}

module.exports = CMVAnalyzer;
