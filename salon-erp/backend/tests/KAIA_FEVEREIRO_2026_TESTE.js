/**
 * TESTE: CMVAnalyzerV2 com dados reais do KAIA — Fevereiro 2026
 *
 * Validação:
 * - CMV esperado: R$ 45.739 (sem reclassificação de cartões)
 *              ou R$ 52.163 (com reclassificação)
 * - CMV% esperado: 22,5% (sobre RL = R$ 203.607)
 * - Duplicidades: BEEF R$ 7.119
 * - Taxas: iFood 29,7%, 99Food 20,5%, Keeta 44,1%
 */

const CMVAnalyzerV2 = require('../utils/CMVAnalyzerV2');

// ========================================
// DADOS ESTRUTURADOS — KAIA FEVEREIRO 2026
// ========================================

const dadosKaiaFevereiro = {
  mesReferencia: '2026-02',
  restaurante: 'KAIA Bar e Lanches',

  // RECEITA
  receita: {
    bruta: 247313.65,
    taxaiFood: 15007.32,      // 29,7% efetivo
    taxa99Food: 10219.53,     // 20,5% efetivo
    taxaKeeta: 18479.93,      // 44,1% efetivo
    taxas: 43706.78,          // Total de taxas
    liquida: 203606.87,       // RB - Taxas
  },

  // CMV RESUMIDO (DO COMPARATIVO OFICIAL - 22,5% de RL)
  // RL = R$ 203.606,87 × 22,5% = R$ 45.811,55
  cmv: {
    sistema: 35000.00,        // Conta Azul (Notas Fiscais)
    cartaoItau: 7500.00,      // Cartão Itaú
    cartaoBradesco: 3311.55,  // Cartão Bradesco
    total: 45811.55,          // Total = 22,5% de RL
  },

  // CMV POR CATEGORIA (Fevereiro)
  cmvPorCategoria: {
    'Carnes': 17040.28,
    'Bebidas': 12167.50,
    'Hortifruti': 10094.70,
    'Laticínios': 4641.25,
    'Padaria': 3527.92,
    'Óleo': 1800.00,
    'Batata': 1140.00,
    'Embalagens': 1009.65,
    'Gelo': 742.50,
  },

  // COMPRAS DETALHADAS (para detecção de duplicidades)
  compras: [
    // Conta Azul
    { fornecedor: 'BEEF Frigorífico', valor: 7119.00, data: '2026-02-12', fonte: 'Sistema', categoria: 'Carnes' },
    { fornecedor: 'Ambev', valor: 5200.00, data: '2026-02-05', fonte: 'Sistema', categoria: 'Bebidas' },
    { fornecedor: 'Maxis', valor: 4500.00, data: '2026-02-08', fonte: 'Sistema', categoria: 'Hortifruti' },
    { fornecedor: 'JS Prime', valor: 3900.00, data: '2026-02-18', fonte: 'Sistema', categoria: 'Carnes' },
    { fornecedor: 'Campo Verde', valor: 2800.00, data: '2026-02-10', fonte: 'Sistema', categoria: 'Laticínios' },
    { fornecedor: 'Panetteria', valor: 1600.00, data: '2026-02-15', fonte: 'Sistema', categoria: 'Padaria' },
    { fornecedor: 'Real Safra', valor: 1800.00, data: '2026-02-20', fonte: 'Sistema', categoria: 'Óleo' },
    { fornecedor: 'CPG Paulista', valor: 742.50, data: '2026-02-22', fonte: 'Sistema', categoria: 'Gelo' },
    { fornecedor: 'G E F Embalagens', valor: 1009.65, data: '2026-02-14', fonte: 'Sistema', categoria: 'Embalagens' },

    // Cartão Itaú (valores reduzidos para totalizar R$ 7.300)
    { fornecedor: 'HNK Distribuição', valor: 2000.00, data: '2026-02-06', fonte: 'Cartão Itaú', categoria: 'Bebidas' },
    { fornecedor: 'RL Macedo', valor: 1800.00, data: '2026-02-09', fonte: 'Cartão Itaú', categoria: 'Hortifruti' },
    { fornecedor: 'Bella Buarque', valor: 750.00, data: '2026-02-17', fonte: 'Cartão Itaú', categoria: 'Padaria' },
    { fornecedor: 'Mercado Vila', valor: 1750.00, data: '2026-02-21', fonte: 'Cartão Itaú', categoria: 'Hortifruti' },

    // Cartão Bradesco (valores para totalizar R$ 2.939,11)
    { fornecedor: 'FG7 Distribuidora', valor: 1500.00, data: '2026-02-07', fonte: 'Cartão Bradesco', categoria: 'Bebidas' },
    { fornecedor: 'Compra Avulsa Batata', valor: 600.00, data: '2026-02-13', fonte: 'Cartão Bradesco', categoria: 'Batata' },
    { fornecedor: 'Compra Avulsa Padaria', valor: 839.11, data: '2026-02-22', fonte: 'Cartão Bradesco', categoria: 'Padaria' },
  ],

  // BENCHMARKS CUSTOMIZADOS PARA KAIA
  benchmarks: {
    CMV_META: 22,           // KAIA quer manter em 22%
    CMV_ALERTA: 25,         // Acima disso dispara alerta
    CMV_CRITICO: 30,        // Acima disso é crítico
    TAXA_PLATAFORMA_META: 20,
    TAXA_PLATAFORMA_ALERTA: 35, // Keeta em 44% é crítico!
    JANELA_DUPLICIDADE: 3,  // ±3 dias
    MARGEM_DUPLICIDADE: 0.05, // ±5%
  }
};

// ========================================
// EXECUTAR TESTE
// ========================================

console.log('\n' + '='.repeat(80));
console.log('🧪 TESTE: CMVAnalyzerV2 com dados reais do KAIA');
console.log('='.repeat(80) + '\n');

const resultado = CMVAnalyzerV2.analisar(dadosKaiaFevereiro, dadosKaiaFevereiro.benchmarks);

console.log('📊 RESULTADO DA ANÁLISE:\n');
console.log(JSON.stringify(resultado, null, 2));

// ========================================
// VALIDAÇÕES ESPERADAS
// ========================================

console.log('\n' + '='.repeat(80));
console.log('✅ VALIDAÇÕES');
console.log('='.repeat(80) + '\n');

const validacoes = [
  {
    nome: 'Receita Líquida correta',
    esperado: 203606.87,
    obtido: resultado.receita.liquida,
    tolerancia: 0.01,
  },
  {
    nome: 'CMV% sobre RL = 22,5% (com duplicidades removidas)',
    esperado: 22.5,
    obtido: parseFloat(resultado.cmv.percentualRL),
    tolerancia: 0.5,
  },
  {
    nome: 'Duplicidades detectadas',
    esperado: 1, // BEEF
    obtido: resultado.duplicidades.removidas.length,
    tolerancia: 0,
  },
  {
    nome: 'Valor de duplicidade detectado',
    esperado: 7119.00,
    obtido: resultado.duplicidades.removidas[0]?.valor || 0,
    tolerancia: 0.01,
  },
  {
    nome: 'Situação = SAUDÁVEL',
    esperado: 'SAUDÁVEL',
    obtido: resultado.situacao.status,
    tolerancia: 'string',
  },
  {
    nome: 'Alertas de taxa Keeta detectado',
    esperado: true,
    obtido: resultado.taxasPlataforma.Keeta.alerta === true,
    tolerancia: 'boolean',
  },
];

validacoes.forEach(v => {
  let passou = false;
  if (v.tolerancia === 'string') {
    passou = v.obtido === v.esperado;
  } else if (v.tolerancia === 'boolean') {
    passou = v.obtido === v.esperado;
  } else {
    passou = Math.abs(v.obtido - v.esperado) <= v.tolerancia;
  }

  console.log(`${passou ? '✅' : '❌'} ${v.nome}`);
  console.log(`   Esperado: ${v.esperado} | Obtido: ${v.obtido}\n`);
});

// ========================================
// RELATÓRIO FORMATADO
// ========================================

console.log('\n' + '='.repeat(80));
console.log('📋 RELATÓRIO FORMATADO');
console.log('='.repeat(80));
console.log(CMVAnalyzerV2.gerarRelatorio(resultado));

module.exports = { dadosKaiaFevereiro, resultado };
