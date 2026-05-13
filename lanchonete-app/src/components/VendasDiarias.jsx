import { useState } from 'react';
import { TURNOS } from '../utils/constants.js';
import { SeletorData } from './SeletorData.jsx';

export function VendasDiarias({
  data,
  onDataChange,
  produtos,
  pagamentos,
  vendas,
  onAdicionarVenda,
  onEditarVenda,
  onDeletarVenda
}) {
  const [turnoAtivo, setTurnoAtivo] = useState('manhã');
  const [modalAberto, setModalAberto] = useState(false);
  const [vendaEmEdicao, setVendaEmEdicao] = useState(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeModal, setQuantidadeModal] = useState(1);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState(pagamentos[0]);

  const vendas_turno = vendas.filter(
    (v) => v.data === data && v.turno === turnoAtivo
  );

  const handleAbrirModal = (produto) => {
    setProdutoSelecionado(produto);
    setQuantidadeModal(1);
    setPagamentoSelecionado(pagamentos[0]);
    setVendaEmEdicao(null);
    setModalAberto(true);
  };

  const handleAbrirEdicao = (item, venda) => {
    setVendaEmEdicao({ ...venda, itemEmEdicao: item });
    setProdutoSelecionado(produtos.find(p => p.id === item.produtoId));
    setQuantidadeModal(item.quantidade);
    setPagamentoSelecionado(item.formaPagamento);
    setModalAberto(true);
  };

  const handleConfirmar = () => {
    if (vendaEmEdicao) {
      // Edição
      const novaVenda = {
        ...vendaEmEdicao,
        itens: vendaEmEdicao.itens.map(item => {
          if (item.id === vendaEmEdicao.itemEmEdicao.id) {
            return {
              ...item,
              quantidade: quantidadeModal,
              formaPagamento: pagamentoSelecionado,
              subtotal: quantidadeModal * item.preco
            };
          }
          return item;
        })
      };
      delete novaVenda.itemEmEdicao;
      onEditarVenda(vendaEmEdicao.id, novaVenda);
    } else {
      // Nova venda
      onAdicionarVenda({
        data,
        turno: turnoAtivo,
        quantidade: quantidadeModal,
        produtoId: produtoSelecionado.id,
        nomeProduto: produtoSelecionado.nome,
        preco: produtoSelecionado.preco,
        formaPagamento: pagamentoSelecionado
      });
    }
    setModalAberto(false);
  };

  const totalTurno = vendas_turno.reduce((sum, venda) => {
    return sum + venda.itens.reduce((s, item) => s + item.quantidade * item.preco, 0);
  }, 0);

  return (
    <div className="vendas-diarias">
      <div className="vendas-header">
        <SeletorData data={data} onChange={onDataChange} />

        <div className="turnos">
          {TURNOS.map((turno) => (
            <button
              key={turno}
              className={`btn-turno ${turnoAtivo === turno ? 'active' : ''}`}
              onClick={() => setTurnoAtivo(turno)}
            >
              {turno}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-produtos">
        {produtos.map((produto) => (
          <button
            key={produto.id}
            className="btn-produto"
            onClick={() => handleAbrirModal(produto)}
          >
            <div className="produto-nome">{produto.nome}</div>
            <div className="produto-preco">R$ {produto.preco.toFixed(2)}</div>
          </button>
        ))}
      </div>

      <div className="vendas-tabela">
        <h3>Vendas - {turnoAtivo}</h3>
        {vendas_turno.length === 0 ? (
          <p className="vazio">Nenhuma venda registrada</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Forma Pag.</th>
                <th>Subtotal</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas_turno.map((venda) =>
                venda.itens.map((item, idx) => (
                  <tr key={`${venda.id}-${idx}`} className="vendas-row">
                    <td
                      className="editable"
                      onClick={() => handleAbrirEdicao(item, venda)}
                    >
                      {item.nomeProduto}
                    </td>
                    <td
                      className="editable"
                      onClick={() => handleAbrirEdicao(item, venda)}
                    >
                      {item.quantidade}
                    </td>
                    <td className="preco">R$ {item.preco.toFixed(2)}</td>
                    <td
                      className="editable"
                      onClick={() => handleAbrirEdicao(item, venda)}
                    >
                      {item.formaPagamento}
                    </td>
                    <td className="subtotal">
                      R$ {(item.quantidade * item.preco).toFixed(2)}
                    </td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => onDeletarVenda(venda.id, idx)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="total-turno">
        <strong>Total do {turnoAtivo}: R$ {totalTurno.toFixed(2)}</strong>
      </div>

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{vendaEmEdicao ? 'Editar Venda' : 'Nova Venda'}</h3>

            <div className="modal-form">
              <div className="form-group">
                <label>Produto: {produtoSelecionado?.nome}</label>
                <p className="info-text">R$ {produtoSelecionado?.preco.toFixed(2)}</p>
              </div>

              <div className="form-group">
                <label>Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={quantidadeModal}
                  onChange={(e) =>
                    setQuantidadeModal(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </div>

              <div className="form-group">
                <label>Forma de Pagamento</label>
                <select
                  value={pagamentoSelecionado}
                  onChange={(e) => setPagamentoSelecionado(e.target.value)}
                >
                  {pagamentos.map((pag) => (
                    <option key={pag} value={pag}>
                      {pag}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-subtotal">
                <strong>Subtotal: R$ {(quantidadeModal * (produtoSelecionado?.preco || 0)).toFixed(2)}</strong>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setModalAberto(false)}
              >
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleConfirmar}>
                {vendaEmEdicao ? 'Atualizar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
