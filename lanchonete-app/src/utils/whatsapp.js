import { MOEDA } from './constants.js';

export function formatarParaWhatsApp(data, lanchonete, totais) {
  const { total_geral, por_pagamento, por_produto } = totais;

  let mensagem = `📊 *Relatório de Vendas - ${lanchonete.nome}*\n`;
  mensagem += `📅 Data: ${formatarData(data)}\n`;
  mensagem += `\n`;

  // Produtos
  mensagem += `*Produtos Vendidos:*\n`;
  Object.entries(por_produto).forEach(([produtoId, dados]) => {
    mensagem += `• ${dados.nome}: ${dados.qtd}x - ${MOEDA}${dados.subtotal.toFixed(2)}\n`;
  });

  mensagem += `\n`;

  // Pagamentos
  mensagem += `*Formas de Pagamento:*\n`;
  Object.entries(por_pagamento).forEach(([forma, valor]) => {
    mensagem += `• ${forma}: ${MOEDA}${valor.toFixed(2)}\n`;
  });

  mensagem += `\n`;
  mensagem += `*Total do Dia: ${MOEDA}${total_geral.toFixed(2)}*\n`;
  mensagem += `\n---\n`;
  mensagem += `Enviado via Lanchonete App`;

  return mensagem;
}

export function copiarParaClipboard(texto) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(texto);
  } else {
    // Fallback para navegadores antigos
    const textArea = document.createElement('textarea');
    textArea.value = texto;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return Promise.resolve();
  }
}

function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function gerarLinkWhatsApp(mensagem) {
  const mensagem_encoded = encodeURIComponent(mensagem);
  return `https://wa.me/?text=${mensagem_encoded}`;
}
