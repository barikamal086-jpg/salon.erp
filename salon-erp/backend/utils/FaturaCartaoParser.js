const { PDFParse } = require('pdf-parse');

// Parser de extrato de fatura de cartão corporativo. Suporta hoje dois layouts:
//   - Bradesco Net Empresa: "DD/MM Histórico US$ R$" (2 números no fim da linha)
//   - Itaú Empresas:        "DD/MM Estabelecimento R$" (1 número no fim da linha,
//     às vezes negativo pra créditos/ajustes, ex: "27/07 RAMPC IMPRESSOS GRAFIC - 0,10")
//
// O Itaú também imprime uma "categoria" (DIVERSOS/ALIMENTAÇÃO/etc + cidade) pra cada
// lançamento, só que numa lista SEPARADA logo depois (o PDF tem duas colunas lado a
// lado, e a extração de texto linear junta tudo bagunçado). Em vez de tentar casar
// posição a posição com essa lista (frágil — quebra fácil se algum item some ou se
// um cartão tiver uma tabela extra de "próximas faturas" misturada no meio, como
// aconteceu num teste real), a sugestão de categoria usa a MESMA regra por
// fornecedor dos dois bancos — mais simples e mais confiável, e o usuário sempre
// revisa/ajusta antes de lançar de qualquer forma.
//
// Se um dia o banco/layout mudar, é aqui que se ajusta — o resto do sistema
// (rotas, frontend) não precisa saber do formato exato do PDF.
class FaturaCartaoParser {
  // Regras de sugestão de categoria por palavra-chave no histórico/estabelecimento.
  // Primeira regra que combinar (case-insensitive, substring) vence.
  static REGRAS_CATEGORIA = [
    { palavras: ['embalagens'], classificacao: 'CMV', subcategoria: 'Embalagem' },
    { palavras: ['carnes', 'acougue', 'açougue', 'frigo'], classificacao: 'CMV', subcategoria: 'Carne' },
    { palavras: ['laticinios', 'laticínios'], classificacao: 'CMV', subcategoria: 'Laticínios' },
    { palavras: ['adega'], classificacao: 'CMV', subcategoria: 'Bebidas' },
    { palavras: ['mercado', 'sacolao', 'sacolão', 'atacad', 'hortifruti', 'doces', 'alimentos', 'padaria', 'pao ao bolo', 'assai'], classificacao: 'CMV', subcategoria: 'Comidas' },
    { palavras: ['uberrides', 'uber', '99app', 'ifood entregador'], classificacao: 'Operacional', subcategoria: 'Transporte' },
    { palavras: ['contabilidade', 'hubs cont'], classificacao: 'Administrativa', subcategoria: 'Contador' },
    { palavras: ['advogado', 'jusbrasil'], classificacao: 'Administrativa', subcategoria: 'Jurídico' },
    { palavras: ['facebk', 'facebook', 'instagram', 'google ads', 'meta '], classificacao: 'Administrativa', subcategoria: 'Marketing' },
    { palavras: ['kalunga', 'papelaria', 'impressos', 'copi'], classificacao: 'Administrativa', subcategoria: 'Material Administrativo' },
    { palavras: ['spotify', 'apple.com', 'canva', 'openai', 'chatgpt', 'serasa', 'conta azul', 'magalu', 'consumer', 'netflix', 'amazon prime', 'google one'], classificacao: 'Administrativa', subcategoria: 'Assinaturas/Software' },
    { palavras: ['anuidade', 'juros', 'iof', 'multa'], classificacao: 'Financeira', subcategoria: 'Custos Financeiros' }
  ];

  static sugerirCategoria(historico) {
    const texto = historico.toLowerCase();
    for (const regra of this.REGRAS_CATEGORIA) {
      if (regra.palavras.some(p => texto.includes(p))) {
        return { classificacao: regra.classificacao, subcategoria: regra.subcategoria };
      }
    }
    // Sem regra específica: cai no "Cartão de Crédito" genérico (Administrativa)
    return { classificacao: 'Administrativa', subcategoria: 'Cartão de Crédito' };
  }

  // Identifica qual banco/layout é esse extrato, pelo texto extraído do PDF.
  static detectarBanco(texto) {
    if (/bradesco/i.test(texto)) return 'bradesco';
    if (/ita[uú]/i.test(texto)) return 'itau';
    return 'desconhecido';
  }

  // Extrai a data de vencimento da fatura (usada como referência de ano pros
  // itens do extrato, que só trazem DD/MM). Cobre os dois formatos observados:
  // "Vencimento: 28/09/2026" (rótulo antes) e "05/09/2026\tData de vencimento:" (rótulo depois).
  static extrairDataVencimento(texto) {
    let match = texto.match(/[Vv]encimento:?\s*(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) {
      match = texto.match(/(\d{2})\/(\d{2})\/(\d{4})\s*[\t\n]*\s*Data de vencimento/i);
    }
    if (!match) return null;
    return { dia: parseInt(match[1]), mes: parseInt(match[2]), ano: parseInt(match[3]) };
  }

  // Infere o ano de um item "DD/MM" a partir do mês/ano de vencimento da fatura.
  // Se o mês do item for maior que o mês de vencimento, assume o ano anterior
  // (cobre virada dez/jan — ex: fatura vence em janeiro, item de dezembro é do ano anterior).
  static inferirAno(mesItem, referencia) {
    if (!referencia) return new Date().getFullYear();
    return mesItem > referencia.mes ? referencia.ano - 1 : referencia.ano;
  }

  static montarItem(dia, mes, historico, valor, referenciaVencimento) {
    if (!valor || isNaN(valor) || valor <= 0) return null; // ignora créditos/ajustes negativos
    const ano = this.inferirAno(parseInt(mes), referenciaVencimento);
    const data = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    const categoria = this.sugerirCategoria(historico);
    return {
      data,
      historico: historico.trim(),
      valor,
      classificacaoSugerida: categoria.classificacao,
      subcategoriaSugerida: categoria.subcategoria
    };
  }

  // Bradesco Net Empresa: "DD/MM Histórico US$ R$" (2 números no fim, o 2º é o valor em R$)
  static extrairItensBradesco(texto, referenciaVencimento) {
    const regexLinha = /^(\d{2})\/(\d{2})\s+(.+?)\s+[\d.,]+\s+([\d.,]+)\s*$/;
    const itens = [];
    for (const linhaBruta of texto.split('\n')) {
      const m = linhaBruta.trim().match(regexLinha);
      if (!m) continue;
      const [, dia, mes, historico, valorStr] = m;
      const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
      const item = this.montarItem(dia, mes, historico, valor, referenciaVencimento);
      if (item) itens.push(item);
    }
    return itens;
  }

  // Itaú Empresas: "DD/MM Estabelecimento R$" (1 número no fim, opcionalmente
  // negativo com um "-" antes — créditos/ajustes, que são ignorados).
  static extrairItensItau(texto, referenciaVencimento) {
    const regexLinha = /^(\d{2})\/(\d{2})\s+(.+?)\s+(-)?\s*([\d.,]+)\s*$/;
    const itens = [];
    for (const linhaBruta of texto.split('\n')) {
      const linha = linhaBruta.trim();
      const m = linha.match(regexLinha);
      if (!m) continue;
      const [, dia, mes, historico, sinalNegativo, valorStr] = m;
      if (sinalNegativo) continue; // crédito/ajuste, não é despesa
      const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
      const item = this.montarItem(dia, mes, historico, valor, referenciaVencimento);
      if (item) itens.push(item);
    }
    return itens;
  }

  static extrairTotalDeclarado(texto, banco) {
    if (banco === 'bradesco') {
      const m = texto.match(/Total:\s*[\d.,]+\s+([\d.,]+)/);
      return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : null;
    }
    if (banco === 'itau') {
      const m = texto.match(/Total\s+desta\s+fatura\s+([\d.,]+)/i);
      return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : null;
    }
    return null;
  }

  // Ponto de entrada: recebe o Buffer do PDF, devolve os itens já parseados.
  static async parsePDF(pdfBuffer) {
    const parser = new PDFParse({ data: pdfBuffer });
    const resultado = await parser.getText();
    const texto = resultado.text;

    const banco = this.detectarBanco(texto);
    const referenciaVencimento = this.extrairDataVencimento(texto);

    let itens = [];
    if (banco === 'bradesco') {
      itens = this.extrairItensBradesco(texto, referenciaVencimento);
    } else if (banco === 'itau') {
      itens = this.extrairItensItau(texto, referenciaVencimento);
    } else {
      // Banco não identificado: tenta os dois formatos e usa o que achar mais itens
      const tentativaBradesco = this.extrairItensBradesco(texto, referenciaVencimento);
      const tentativaItau = this.extrairItensItau(texto, referenciaVencimento);
      itens = tentativaBradesco.length >= tentativaItau.length ? tentativaBradesco : tentativaItau;
    }

    const totalDeclarado = this.extrairTotalDeclarado(texto, banco);

    return {
      banco,
      dataVencimento: referenciaVencimento
        ? `${referenciaVencimento.ano}-${String(referenciaVencimento.mes).padStart(2, '0')}-${String(referenciaVencimento.dia).padStart(2, '0')}`
        : null,
      itens,
      totalDeclarado,
      totalExtraido: itens.reduce((soma, i) => soma + i.valor, 0)
    };
  }
}

module.exports = FaturaCartaoParser;
