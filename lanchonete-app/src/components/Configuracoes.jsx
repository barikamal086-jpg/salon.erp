import { useState } from 'react';
import { Onboarding } from './Onboarding.jsx';

export function Configuracoes({
  lanchonete,
  produtos,
  pagamentos,
  onAtualizar,
  onReset
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(lanchonete.nome);
  const [produtosEdit, setProdutosEdit] = useState(
    produtos.map(p => ({ ...p }))
  );
  const [pagamentosEdit, setPagamentosEdit] = useState(
    Object.fromEntries(pagamentos.map(p => [p, true]))
  );

  const handleSalvar = () => {
    const produtosValidos = produtosEdit.filter(p => p.nome.trim() && p.preco);
    const pagamentosValidos = Object.keys(pagamentosEdit).filter(k => pagamentosEdit[k]);

    if (produtosValidos.length > 0 && pagamentosValidos.length > 0) {
      onAtualizar({
        lanchonete: { nome: nome.trim() },
        produtos: produtosValidos,
        pagamentos: pagamentosValidos
      });
      setEditando(false);
    }
  };

  const handleAdicionarProduto = () => {
    setProdutosEdit([...produtosEdit, { id: 'temp_' + Date.now(), nome: '', preco: 0 }]);
  };

  const handleRemoverProduto = (index) => {
    setProdutosEdit(produtosEdit.filter((_, i) => i !== index));
  };

  const handleProdutoChange = (index, field, value) => {
    const novo = [...produtosEdit];
    novo[index][field] = value;
    setProdutosEdit(novo);
  };

  const handlePagamentoChange = (tipo) => {
    setPagamentosEdit({
      ...pagamentosEdit,
      [tipo]: !pagamentosEdit[tipo]
    });
  };

  return (
    <div className="configuracoes">
      <h2>Configurações</h2>

      {!editando ? (
        <div className="config-display">
          <div className="config-item">
            <label>Lanchonete</label>
            <p>{lanchonete.nome}</p>
          </div>

          <div className="config-item">
            <label>Produtos ({produtos.length})</label>
            <ul className="produtos-list-config">
              {produtos.map((p) => (
                <li key={p.id}>
                  {p.nome} - R$ {p.preco.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>

          <div className="config-item">
            <label>Formas de Pagamento</label>
            <div className="pagamentos-list-config">
              {pagamentos.map((p) => (
                <span key={p} className="badge">{p}</span>
              ))}
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={() => setEditando(true)}
          >
            Editar
          </button>

          <button
            className="btn-danger"
            onClick={() => {
              if (confirm('Tem certeza? Isso vai resetar toda a configuração')) {
                onReset();
              }
            }}
          >
            Resetar Tudo
          </button>
        </div>
      ) : (
        <div className="config-edit">
          <div className="form-group">
            <label>Nome da Lanchonete</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Produtos</label>
            <div className="produtos-edit-list">
              {produtosEdit.map((produto, index) => (
                <div key={index} className="produto-edit-row">
                  <input
                    type="text"
                    placeholder="Nome"
                    value={produto.nome}
                    onChange={(e) =>
                      handleProdutoChange(index, 'nome', e.target.value)
                    }
                  />
                  <input
                    type="number"
                    placeholder="Preço"
                    step="0.01"
                    min="0"
                    value={produto.preco || ''}
                    onChange={(e) => {
                      const valor = e.target.value === '' ? '' : parseFloat(e.target.value);
                      handleProdutoChange(index, 'preco', valor);
                    }}
                  />
                  {produtosEdit.length > 1 && (
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoverProduto(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="btn-secondary"
              onClick={handleAdicionarProduto}
            >
              + Adicionar
            </button>
          </div>

          <div className="form-group">
            <label>Formas de Pagamento</label>
            <div className="pagamentos-edit-list">
              {Object.keys(pagamentosEdit).map((tipo) => (
                <label key={tipo} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pagamentosEdit[tipo]}
                    onChange={() => handlePagamentoChange(tipo)}
                  />
                  <span>{tipo}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="config-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setEditando(false);
                setNome(lanchonete.nome);
                setProdutosEdit(produtos.map(p => ({ ...p })));
                setPagamentosEdit(Object.fromEntries(pagamentos.map(p => [p, true])));
              }}
            >
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSalvar}>
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
