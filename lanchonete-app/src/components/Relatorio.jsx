import { useState } from 'react';
import { SeletorData } from './SeletorData.jsx';
import { formatarParaWhatsApp, copiarParaClipboard } from '../utils/whatsapp.js';
import { calcularTotaisPorData } from '../utils/storage.js';

export function Relatorio({
  lanchonete,
  data,
  onDataChange,
  produtos,
  pagamentos,
  vendas,
  despesas = []
}) {
  const [mensagemCopiada, setMensagemCopiada] = useState(false);

  const totais = calcularTotaisPorData(vendas, data, produtos);
  const { total_geral, por_pagamento, por_produto } = totais;

  // Calcular despesas do dia
  const despesas_dia = despesas.filter(d => d.data === data);
  const total_despesas = despesas_dia.reduce((sum, d) => sum + d.valor, 0);
  const lucro_liquido = total_geral - total_despesas;

  const handleCompartilhar = async () => {
    const mensagem = formatarParaWhatsApp(data, lanchonete, totais);
    try {
      await copiarParaClipboard(mensagem);
      setMensagemCopiada(true);
      setTimeout(() => setMensagemCopiada(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const produtosSorted = Object.entries(por_produto).sort(
    ([, a], [, b]) => b.subtotal - a.subtotal
  );

  return (
    <div className="relatorio">
      <div className="relatorio-header">
        <h2>Relatório de Vendas</h2>
        <SeletorData data={data} onChange={onDataChange} />
      </div>

      <div className="relatorio-content">
        {total_geral === 0 ? (
          <div className="vazio">
            <p>Nenhuma venda registrada para esta data</p>
          </div>
        ) : (
          <>
            <div className="secao">
              <h3>Produtos Vendidos</h3>
              <table className="tabela-relatorio">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Preço Unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosSorted.map(([produtoId, dados]) => (
                    <tr key={produtoId}>
                      <td>{dados.nome}</td>
                      <td className="center">{dados.qtd}</td>
                      <td className="center">R$ {dados.preco.toFixed(2)}</td>
                      <td className="right">R$ {dados.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="secao">
              <h3>Resumo por Forma de Pagamento</h3>
              <div className="resumo-pagamentos">
                {Object.entries(por_pagamento).map(([forma, valor]) => (
                  <div key={forma} className="resumo-item">
                    <span className="forma">{forma}</span>
                    <span className="valor">R$ {valor.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="secao">
              <h3>Resumo Financeiro</h3>
              <div className="resumo-financeiro">
                <div className="item-receita">
                  <span>Receita Total</span>
                  <span className="valor">R$ {total_geral.toFixed(2)}</span>
                </div>
                <div className="item-despesa">
                  <span>Despesas</span>
                  <span className="valor">R$ {total_despesas.toFixed(2)}</span>
                </div>
                <div className="item-lucro">
                  <span>Lucro Líquido</span>
                  <span className="valor">R$ {lucro_liquido.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {despesas_dia.length > 0 && (
              <div className="secao">
                <h3>Despesas do Dia</h3>
                <table className="tabela-relatorio">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesas_dia.map((despesa) => (
                      <tr key={despesa.id}>
                        <td>{despesa.descricao}</td>
                        <td>{despesa.categoria}</td>
                        <td className="right">R$ {despesa.valor.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="acoes-relatorio">
              <button
                className="btn-primary"
                onClick={handleCompartilhar}
              >
                {mensagemCopiada ? '✓ Copiado!' : 'Compartilhar via WhatsApp'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
