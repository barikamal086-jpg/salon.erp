const { PDFParse } = require('pdf-parse');

// Parser específico do extrato de fatura de cartão corporativo Bradesco Net Empresa.
// Layout de cada linha do "Detalhe do Extrato": "DD/MM Histórico US$ R$"
// Ex: "24/07 G E F EMBALAGENS LTDA 0,00 319,60"
//
// Se um dia o banco/layout mudar, é aqui que se ajusta — o resto do sistema
// (rotas, frontend) não precisa saber do formato exato do PDF.
class FaturaCartaoParser {
  // Regras de sugestão de categoria por palavra-chave no histórico (fornecedor).
  // Primeira regra que combinar (case-insensitive, substring) vence.
  static REGRAS_CATEGORIA = [
    { palavras: ['embalagens'], classificacao: 'CMV', subcategoria: 'Embalagem' },
    { palavras: ['carnes', 'acougue', 'açougue'], classificacao: 'CMV', subcategoria: 'Carne' },
    { palavras: ['laticinios', 'laticínios'], classificacao: 'CMV', subcategoria: 'Laticínios' },
    { palavras: ['adega'], classificacao: 'CMV', subcategoria: 'Bebidas' },
    { palavras: ['mercado', 'sacolao', 'sacolão', 'atacad', 'hortifruti', 'doces', 'alimentos', 'padaria'], classificacao: 'CMV', subcategoria: 'Comidas' },
    { palavras: ['uberrides', 'uber', '99app', 'ifood entregador'], classificacao: 'Operacional', subcategoria: 'Transporte' },
    { palavras: ['contabilidade', 'hubs cont'], classificacao: 'Administrativa', subcategoria: 'Contador' },
    { palavras: ['advogado', 'jusbrasil'], classificacao: 'Administrativa', subcategoria: 'Jurídico' },
    { palavras: ['facebk', 'facebook', 'instagram', 'google ads', 'meta '], classificacao: 'Administrativa', subcategoria: 'Marketing' },
    { palavras: ['kalunga', 'papelaria'], classificacao: 'Administrativa', subcategoria: 'Material Administrativo' },
    { palavras: ['spotify', 'apple.com', 'canva', 'openai', 'chatgpt', 'serasa', 'conta azul', 'magalu', 'consumer', 'netflix', 'amazon prime'], classificacao: 'Administrativa', subcategoria: 'Assinaturas/Software' },
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

  // Extrai a data de vencimento da fatura (usada como referência de ano pros
  // itens do extrato, que só trazem DD/MM). Ex: "Data de vencimento: 05/09/2026"
  static extrairDataVencimento(texto) {
    // O PDF pode trazer "Data de vencimento: 05/09/2026" OU, como no extrato
    // Bradesco Net Empresa, o valor ANTES do rótulo: "05/09/2026\tData de vencimento:"
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

  // Extrai os itens do "Detalhe do Extrato" a partir do texto já extraído do PDF.
  static extrairItens(texto, referenciaVencimento) {
    const linhas = texto.split('\n');
    const itens = [];

    // "20/01 CONTA AZUL 008/012 0,00 316,68" → dia, mês, histórico, valor (R$, último número da linha)
    const regexLinha = /^(\d{2})\/(\d{2})\s+(.+?)\s+[\d.,]+\s+([\d.,]+)\s*$/;

    for (const linhaBruta of linhas) {
      const linha = linhaBruta.trim();
      const m = linha.match(regexLinha);
      if (!m) continue;

      const [, dia, mes, historico, valorStr] = m;
      const mesNum = parseInt(mes);
      const ano = this.inferirAno(mesNum, referenciaVencimento);
      const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));

      if (!valor || isNaN(valor)) continue;

      const data = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      const categoria = this.sugerirCategoria(historico);

      itens.push({
        data,
        historico: historico.trim(),
        valor,
        classificacaoSugerida: categoria.classificacao,
        subcategoriaSugerida: categoria.subcategoria
      });
    }

    return itens;
  }

  // Ponto de entrada: recebe o Buffer do PDF, devolve os itens já parseados.
  static async parsePDF(pdfBuffer) {
    const parser = new PDFParse({ data: pdfBuffer });
    const resultado = await parser.getText();
    const texto = resultado.text;

    const referenciaVencimento = this.extrairDataVencimento(texto);
    const itens = this.extrairItens(texto, referenciaVencimento);

    const totalMatch = texto.match(/Total:\s*[\d.,]+\s+([\d.,]+)/);
    const totalDeclarado = totalMatch ? parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.')) : null;

    return {
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
