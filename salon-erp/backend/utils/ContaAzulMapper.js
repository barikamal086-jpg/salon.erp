/**
 * Mapeamento de categorias Conta Azul → tipo_despesa ERP
 * e lógica de importação do Conta Azul
 */

class ContaAzulMapper {
  // Mapeamento de categorias Conta Azul → tipo_despesa ERP
  static get mapeamentoCategorias() {
    return {
      // CMV - Comida
      'hortifruti': { classificacao: 'CMV', subcategoria: 'Hortifruti', canal: 'Salão' },
      'bebidas': { classificacao: 'CMV', subcategoria: 'Bebidas', canal: 'Salão' },
      'carne': { classificacao: 'CMV', subcategoria: 'Carne', canal: 'Salão' },
      'padaria': { classificacao: 'CMV', subcategoria: 'Padaria', canal: 'Salão' },
      'óleo': { classificacao: 'CMV', subcategoria: 'Óleo', canal: 'Salão' },
      'embalagem': { classificacao: 'CMV', subcategoria: 'Embalagem', canal: 'Salão' },
      'descartáveis': { classificacao: 'CMV', subcategoria: 'Embalagem', canal: 'Salão' },
      'gelo': { classificacao: 'CMV', subcategoria: 'Bebidas', canal: 'Salão' },
      'laticínios': { classificacao: 'CMV', subcategoria: 'Hortifruti', canal: 'Salão' },
      'laticinios': { classificacao: 'CMV', subcategoria: 'Hortifruti', canal: 'Salão' }, // sem acento

      // Operacional
      'freelancer': { classificacao: 'Operacional', subcategoria: 'Pessoal', canal: 'Salão' },
      'aluguel': { classificacao: 'Operacional', subcategoria: 'Aluguel', canal: 'Salão' },
      'água e saneamento': { classificacao: 'Operacional', subcategoria: 'Utilidades', canal: 'Salão' },
      'energia elétrica': { classificacao: 'Operacional', subcategoria: 'Utilidades', canal: 'Salão' },
      'gás': { classificacao: 'Operacional', subcategoria: 'Utilidades', canal: 'Salão' },

      // Administrativa
      'salário': { classificacao: 'Administrativa', subcategoria: 'Pessoal', canal: 'Salão' },
      'impostos': { classificacao: 'Administrativa', subcategoria: 'Impostos', canal: 'Salão' },
      'iptu': { classificacao: 'Administrativa', subcategoria: 'Impostos', canal: 'Salão' },
      'prolabore': { classificacao: 'Administrativa', subcategoria: 'Pessoal', canal: 'Salão' },
      'dividendos': { classificacao: 'Administrativa', subcategoria: 'Pessoal', canal: 'Salão' },

      // Financeira - Taxas de Plataforma
      'taxas ifood': { classificacao: 'Financeira', subcategoria: 'Taxas', canal: 'iFood' },
      'taxa 99food': { classificacao: 'Financeira', subcategoria: 'Taxas', canal: '99Food' },
      'keeta food': { classificacao: 'Financeira', subcategoria: 'Taxas', canal: 'Keeta' }
    };
  }

  /**
   * Mapear categoria Conta Azul para tipo_despesa ERP
   * @param {string} categoriaContaAzul - Categoria do Conta Azul
   * @returns {object} {classificacao, subcategoria, canal}
   */
  static mapearCategoria(categoriaContaAzul) {
    if (!categoriaContaAzul) {
      return {
        classificacao: 'Operacional',
        subcategoria: 'Diversos',
        canal: 'Salão'
      };
    }

    const chave = categoriaContaAzul.toLowerCase().trim();
    return this.mapeamentoCategorias[chave] || {
      classificacao: 'Operacional',
      subcategoria: 'Diversos',
      canal: 'Salão'
    };
  }

  /**
   * Processar linha do Excel Conta Azul
   * @param {object} linha - Objeto com colunas do Excel
   * @param {number} indice - Índice da linha
   * @returns {object} Dados processados para importação
   */
  static processarLinhaExcel(linha, indice) {
    try {
      // Extrair campos
      const data = linha['Data de competência'] || linha['data'] || null;
      const descricao = linha['Descrição'] || linha['descricao'] || '';
      const fornecedorNome = linha['Nome do fornecedor/cliente'] || linha['fornecedor'] || 'Fornecedor Desconhecido';
      const valorStr = String(linha['Valor (R$)'] || linha['valor'] || '0').replace(/[R$\s]/g, '').replace(',', '.');
      const valor = parseFloat(valorStr) || 0;
      const categoriaCA = linha['Categoria 1'] || linha['categoria'] || 'Diversos';
      const identificador = linha['Identificador'] || `IMPORT-${indice}-${Date.now()}`;

      // Determinar tipo e valor absoluto
      const tipo = valor < 0 ? 'despesa' : 'receita';
      const valorAbsoluto = Math.abs(valor);

      // Mapear categoria
      const mapeamento = this.mapearCategoria(categoriaCA);

      return {
        data: this._formatarData(data),
        descricao,
        fornecedor_nome: fornecedorNome,
        total: valorAbsoluto,
        tipo,
        categoria: mapeamento.canal || 'Salão',
        classificacao: mapeamento.classificacao,
        subcategoria: mapeamento.subcategoria,
        categoria_conta_azul: categoriaCA,
        identificador,
        valid: true
      };
    } catch (error) {
      return {
        valid: false,
        erro: error.message,
        indice
      };
    }
  }

  /**
   * Formatar data para YYYY-MM-DD
   * @private
   */
  static _formatarData(data) {
    if (!data) return new Date().toISOString().split('T')[0];

    // Se é número (serial do Excel)
    if (typeof data === 'number') {
      // Excel serial: dias desde 1900-01-01
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (data - 1) * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }

    // Se é string, tentar vários formatos
    const str = String(data).trim();

    // Formato DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [dia, mes, ano] = str.split('/');
      return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }

    // Formato DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
      const [dia, mes, ano] = str.split('-');
      return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }

    // Já em YYYY-MM-DD?
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // Tentar parsear como Date
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}

    return new Date().toISOString().split('T')[0];
  }
}

module.exports = ContaAzulMapper;
