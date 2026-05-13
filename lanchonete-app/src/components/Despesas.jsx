import { useState } from 'react';
import { CATEGORIAS_DESPESA } from '../utils/constants.js';
import { SeletorData } from './SeletorData.jsx';

export function Despesas({
  data,
  onDataChange,
  despesas,
  onAdicionarDespesa,
  onEditarDespesa,
  onDeletarDespesa
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [despesaEmEdicao, setDespesaEmEdicao] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS_DESPESA[0]);
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');

  const despesas_dia = despesas.filter(d => d.data === data);
  const total_despesas = despesas_dia.reduce((sum, d) => sum + d.valor, 0);

  const handleAbrirModal = (despesa = null) => {
    if (despesa) {
      setDespesaEmEdicao(despesa);
      setDescricao(despesa.descricao);
      setValor(despesa.valor.toString());
      setCategoria(despesa.categoria);
      setFormaPagamento(despesa.formaPagamento);
    } else {
      setDespesaEmEdicao(null);
      setDescricao('');
      setValor('');
      setCategoria(CATEGORIAS_DESPESA[0]);
      setFormaPagamento('Dinheiro');
    }
    setModalAberto(true);
  };

  const handleConfirmar = () => {
    if (!descricao.trim() || !valor.trim()) {
      alert('Preencha descrição e valor');
      return;
    }

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      alert('Valor inválido');
      return;
    }

    if (despesaEmEdicao) {
      onEditarDespesa(despesaEmEdicao.id, {
        ...despesaEmEdicao,
        descricao: descricao.trim(),
        valor: valorNum,
        categoria,
        formaPagamento
      });
    } else {
      onAdicionarDespesa({
        data,
        descricao: descricao.trim(),
        valor: valorNum,
        categoria,
        formaPagamento
      });
    }

    setModalAberto(false);
  };

  return (
    <div className="despesas">
      <div className="despesas-header">
        <SeletorData data={data} onChange={onDataChange} />
        <button
          className="btn-primary"
          onClick={() => handleAbrirModal()}
          style={{ marginTop: 0, width: 'auto' }}
        >
          + Adicionar Despesa
        </button>
      </div>

      <div className="despesas-tabela">
        <h3>Despesas - {data}</h3>
        {despesas_dia.length === 0 ? (
          <p className="vazio">Nenhuma despesa registrada</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Forma Pag.</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {despesas_dia.map((despesa) => (
                <tr key={despesa.id} className="despesas-row">
                  <td>{despesa.descricao}</td>
                  <td>{despesa.categoria}</td>
                  <td>{despesa.formaPagamento}</td>
                  <td className="valor">R$ {despesa.valor.toFixed(2)}</td>
                  <td>
                    <button
                      className="btn-edit"
                      onClick={() => handleAbrirModal(despesa)}
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => onDeletarDespesa(despesa.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="total-despesas">
        <strong>Total de Despesas: R$ {total_despesas.toFixed(2)}</strong>
      </div>

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{despesaEmEdicao ? 'Editar Despesa' : 'Nova Despesa'}</h3>

            <div className="modal-form">
              <div className="form-group">
                <label>Descrição</label>
                <input
                  type="text"
                  placeholder="ex: Compra de ingredientes"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Valor</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  {CATEGORIAS_DESPESA.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Forma de Pagamento</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                >
                  {['Dinheiro', 'PIX', 'Débito', 'Crédito'].map((pag) => (
                    <option key={pag} value={pag}>
                      {pag}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-subtotal">
                <strong>
                  Valor: R$ {(parseFloat(valor) || 0).toFixed(2)}
                </strong>
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
                {despesaEmEdicao ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
