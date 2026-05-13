import { DIAS_HISTORICO } from './constants.js';

const STORAGE_KEY = 'lanchonete_app_data';

const DEFAULT_STATE = {
  lanchonete: { nome: '' },
  produtos: [],
  pagamentos: [],
  vendas: []
};

export function initializeStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  }
  return DEFAULT_STATE;
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getData() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : DEFAULT_STATE;
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY);
}

export function limparHistoricoAntigo(vendas) {
  const agora = new Date();
  const trinta_dias_atras = new Date(agora.getTime() - DIAS_HISTORICO * 24 * 60 * 60 * 1000);
  const hoje = agora.toISOString().split('T')[0];
  const data_limite = trinta_dias_atras.toISOString().split('T')[0];

  return vendas.filter(venda => {
    return venda.data >= data_limite || venda.data === hoje;
  });
}

export function calcularTotaisPorTurno(vendas, data, turno) {
  const vendas_dia_turno = vendas.filter(
    v => v.data === data && v.turno === turno
  );

  let total_geral = 0;
  const por_pagamento = {};
  const por_produto = {};

  vendas_dia_turno.forEach(venda => {
    venda.itens.forEach(item => {
      const produto = null; // será passado como prop
      const subtotal = item.quantidade * item.preco;
      total_geral += subtotal;

      // Por pagamento
      if (!por_pagamento[item.formaPagamento]) {
        por_pagamento[item.formaPagamento] = 0;
      }
      por_pagamento[item.formaPagamento] += subtotal;

      // Por produto
      if (!por_produto[item.produtoId]) {
        por_produto[item.produtoId] = { qtd: 0, subtotal: 0 };
      }
      por_produto[item.produtoId].qtd += item.quantidade;
      por_produto[item.produtoId].subtotal += subtotal;
    });
  });

  return {
    total_geral,
    por_pagamento,
    por_produto,
    vendas: vendas_dia_turno
  };
}

export function calcularTotaisPorData(vendas, data, produtos) {
  const vendas_data = vendas.filter(v => v.data === data);

  let total_geral = 0;
  const por_pagamento = {};
  const por_produto = {};

  vendas_data.forEach(venda => {
    venda.itens.forEach(item => {
      const subtotal = item.quantidade * item.preco;
      total_geral += subtotal;

      if (!por_pagamento[item.formaPagamento]) {
        por_pagamento[item.formaPagamento] = 0;
      }
      por_pagamento[item.formaPagamento] += subtotal;

      if (!por_produto[item.produtoId]) {
        por_produto[item.produtoId] = {
          nome: produtos.find(p => p.id === item.produtoId)?.nome || 'Produto',
          preco: item.preco,
          qtd: 0,
          subtotal: 0
        };
      }
      por_produto[item.produtoId].qtd += item.quantidade;
      por_produto[item.produtoId].subtotal += subtotal;
    });
  });

  return {
    total_geral,
    por_pagamento,
    por_produto,
    vendas: vendas_data
  };
}
