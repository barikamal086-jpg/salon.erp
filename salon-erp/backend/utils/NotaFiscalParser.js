const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const pdfParse = require('pdf-parse');

class NotaFiscalParser {
  /**
   * Parsear arquivo XML de NF-e (Nota Fiscal Eletrônica)
   * @param {Buffer|string} xmlContent - Conteúdo do arquivo XML
   * @returns {Promise<Object>} Dados extraídos da NF-e
   */
  static async parseXML(xmlContent) {
    try {
      console.log('🔄 Iniciando parsing XML...');
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true
      });

      const xml = await parser.parseStringPromise(xmlContent);
      console.log('✅ XML parseado com sucesso');

      // Navegar pela estrutura XML da NF-e padrão
      // Estrutura: nfeProc > NFe > infNFe > ide/emit/dest/det/total/cobr
      const nfeData = xml.nfeProc?.NFe?.infNFe || xml.NFe?.infNFe || {};
      console.log('📋 nfeData encontrado:', !!nfeData);

      const ide = nfeData.ide || {};
      const emit = nfeData.emit || {};
      const total = nfeData.total?.ICMSTot || {};
      const det = Array.isArray(nfeData.det) ? nfeData.det : [nfeData.det];
      const cobr = nfeData.cobr || {}; // Informações de cobrança

      console.log('🔍 Campos extraídos:');
      console.log('   - IDE:', { cUF: ide.cUF, AAMM: ide.AAMM, nNF: ide.nNF });
      console.log('   - EMIT:', { CNPJ: emit.CNPJ, xNome: emit.xNome });
      console.log('   - TOTAL:', { vNF: total.vNF });

      // Extrair data de vencimento de cobr.dup (duplicata/parcela)
      let dataVencimento = ide.dEmi; // Default: data de emissão
      if (cobr.dup) {
        const dup = Array.isArray(cobr.dup) ? cobr.dup[0] : cobr.dup;
        dataVencimento = dup.dVenc || ide.dEmi;
      }

      // Extrair informações principais
      const numeroNF = `${ide.cUF}-${ide.AAMM}-${emit.CNPJ}-${ide.modelo}-${ide.serie}-${ide.nNF}`.replace(/undefined/g, '');
      const descricao = this._extrairDescricaoItens(det);
      const classificacao = this._sugerirClassificacao(descricao, det);

      // Validar e converter valor_total com segurança
      let valorTotal = 0;
      try {
        if (total.vNF) {
          valorTotal = parseFloat(String(total.vNF).replace(',', '.'));
          if (isNaN(valorTotal)) valorTotal = 0;
        }
      } catch (e) {
        console.warn('⚠️  Erro ao converter valor_total:', e.message);
        valorTotal = 0;
      }

      const resultado = {
        numero_nf: numeroNF || `NF-${Date.now()}`,
        fornecedor_nome: emit.xNome || 'Fornecedor Desconhecido',
        fornecedor_cnpj: emit.CNPJ || '',
        data_emissao: this._formatarData(ide.dEmi),
        data_vencimento: this._formatarData(dataVencimento),
        valor_total: valorTotal,
        descricao: descricao,
        classificacao_sugerida: classificacao,
        xml_content: xmlContent.toString('utf8')
      };

      console.log('✅ XML parsing finalizado:', resultado.numero_nf);
      return resultado;
    } catch (error) {
      console.error('❌ Erro ao fazer parsing do XML:', error.message);
      console.error('   Stack:', error.stack);
      throw new Error(`Erro ao fazer parsing do XML: ${error.message}`);
    }
  }

  /**
   * Parsear arquivo PDF (fallback para quando não temos XML)
   * @param {Buffer} pdfBuffer - Conteúdo do arquivo PDF
   * @returns {Promise<Object>} Dados extraídos do PDF
   */
  static async parsePDF(pdfBuffer) {
    try {
      const data = await pdfParse(pdfBuffer);
      const text = data.text;

      // Tentar extrair informações do texto do PDF
      // Padrão: "33.028.314/0001-87" para CNPJ
      // Padrão: "Nº 123456" para número da nota

      const cnpjMatch = text.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})/);
      const numeroMatch = text.match(/[Nn]º\s*(\d+)/);
      const dataMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
      const valorMatch = text.match(/[Vv]alor\s*[Tt]otal[:=]?\s*R?\$?\s*([\d.,]+)/);

      // Extrair primeira menção ao fornecedor
      const linhas = text.split('\n');
      let fornecedor = 'Fornecedor do PDF';
      for (let i = 0; i < linhas.length; i++) {
        if (linhas[i].includes('CNPJ') || linhas[i].includes('Razão Social')) {
          fornecedor = linhas[i + 1] || fornecedor;
          break;
        }
      }

      return {
        numero_nf: numeroMatch ? `NF-PDF-${numeroMatch[1]}` : `NF-${Date.now()}`,
        fornecedor_nome: fornecedor.trim(),
        fornecedor_cnpj: cnpjMatch ? cnpjMatch[1] : '',
        data_emissao: dataMatch ? dataMatch[1] : new Date().toISOString().split('T')[0],
        valor_total: valorMatch ? parseFloat(valorMatch[1].replace(/[.,]/g, (m, i) => i === valorMatch[1].lastIndexOf(m) ? '.' : '')) : 0,
        descricao: text.substring(0, 500), // Primeiros 500 caracteres como descrição
        classificacao_sugerida: this._sugerirClassificacao(text, []),
        pdf_text: text
      };
    } catch (error) {
      throw new Error(`Erro ao fazer parsing do PDF: ${error.message}`);
    }
  }

  /**
   * Sugerir classificação baseado na descrição/itens
   * @private
   */
  static _sugerirClassificacao(descricao, itens = []) {
    const texto = (descricao || '').toLowerCase();

    // Palavras-chave para CMV
    const palavrasCMV = ['hortifruti', 'alimento', 'bebida', 'carne', 'peixe', 'óleo', 'batata', 'açúcar', 'sal', 'farinha', 'padaria', 'pão', 'embalagem', 'copo', 'prato'];

    // Palavras-chave para Operacional
    const palavrasOperacional = ['aluguel', 'água', 'luz', 'gás', 'energia', 'limpeza', 'manutenção', 'reparo', 'conserto', 'ferrament', 'material'];

    // Palavras-chave para Administrativa
    const palavrasAdministrativa = ['imposto', 'taxa', 'salário', 'pessoal', 'software', 'sistema', 'telefone', 'internet'];

    // Contar ocorrências
    let pontuacaoCMV = 0, pontuacaoOp = 0, pontuacaoAdmin = 0;

    palavrasCMV.forEach(palavra => {
      if (texto.includes(palavra)) pontuacaoCMV += 2;
    });

    palavrasOperacional.forEach(palavra => {
      if (texto.includes(palavra)) pontuacaoOp += 2;
    });

    palavrasAdministrativa.forEach(palavra => {
      if (texto.includes(palavra)) pontuacaoAdmin += 2;
    });

    // Retornar classificação com maior pontuação
    if (pontuacaoCMV > pontuacaoOp && pontuacaoCMV > pontuacaoAdmin) {
      return 'CMV';
    } else if (pontuacaoOp > pontuacaoAdmin) {
      return 'Operacional';
    } else if (pontuacaoAdmin > 0) {
      return 'Administrativa';
    } else {
      return 'Operacional'; // Padrão
    }
  }

  /**
   * Extrair descrição dos itens
   * @private
   */
  static _extrairDescricaoItens(detalhes) {
    try {
      if (!detalhes) return 'Nota Fiscal';

      const itens = Array.isArray(detalhes) ? detalhes : [detalhes];
      const descricoes = itens
        .slice(0, 3) // Pegar apenas os 3 primeiros itens
        .map(item => {
          try {
            return item.prod?.xProd || item.prod?.descricao || 'Item';
          } catch (e) {
            return 'Item';
          }
        })
        .filter(desc => desc !== 'Item');

      return descricoes.length > 0
        ? descricoes.join(', ')
        : 'Vários itens';
    } catch (error) {
      return 'Nota Fiscal';
    }
  }

  /**
   * Formatar data no padrão YYYY-MM-DD
   * @private
   */
  static _formatarData(data) {
    if (!data) return new Date().toISOString().split('T')[0];

    // Se já está no formato YYYY-MM-DD, retornar
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return data;
    }

    // Se está em YYYYMMDD, converter
    if (/^\d{8}$/.test(data)) {
      return `${data.substring(0, 4)}-${data.substring(4, 6)}-${data.substring(6, 8)}`;
    }

    // Tentar fazer parsing como data
    try {
      const date = new Date(data);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}

    return new Date().toISOString().split('T')[0];
  }

  /**
   * Detectar tipo de arquivo e fazer parsing apropriado
   */
  static async detectarEParsear(buffer, filename) {
    const extension = path.extname(filename).toLowerCase();

    if (extension === '.xml') {
      return await this.parseXML(buffer);
    } else if (extension === '.pdf') {
      return await this.parsePDF(buffer);
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${extension}. Use XML ou PDF.`);
    }
  }
}

module.exports = NotaFiscalParser;
