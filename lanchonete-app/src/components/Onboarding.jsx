import { useState } from 'react';

export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState('');
  const [produtos, setProdutos] = useState([{ nome: '', preco: '' }]);
  const [pagamentos, setPagamentos] = useState({
    Dinheiro: true,
    PIX: false,
    Débito: false,
    Crédito: false
  });

  const handleNomeSubmit = (e) => {
    e.preventDefault();
    if (nome.trim()) {
      setStep(2);
    }
  };

  const handleAdicionarProduto = () => {
    setProdutos([...produtos, { nome: '', preco: '' }]);
  };

  const handleRemoverProduto = (index) => {
    setProdutos(produtos.filter((_, i) => i !== index));
  };

  const handleProdutoChange = (index, field, value) => {
    const novosProdutos = [...produtos];
    novosProdutos[index][field] = value;
    setProdutos(novosProdutos);
  };

  const handleProdutosSubmit = (e) => {
    e.preventDefault();
    const produtosValidos = produtos.filter(p => p.nome.trim() && p.preco.trim());
    if (produtosValidos.length > 0) {
      setStep(3);
    }
  };

  const handlePagamentoChange = (tipo) => {
    setPagamentos({
      ...pagamentos,
      [tipo]: !pagamentos[tipo]
    });
  };

  const handleComplete = () => {
    const pagamentosValidos = Object.keys(pagamentos).filter(k => pagamentos[k]);
    if (pagamentosValidos.length > 0) {
      const produtosProcessados = produtos
        .filter(p => p.nome.trim() && p.preco.trim())
        .map((p, i) => ({
          id: 'prod_' + Date.now() + '_' + i,
          nome: p.nome.trim(),
          preco: parseFloat(p.preco.replace(',', '.'))
        }));

      onComplete({
        lanchonete: { nome: nome.trim() },
        produtos: produtosProcessados,
        pagamentos: pagamentosValidos,
        vendas: []
      });
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        {step === 1 && (
          <>
            <h1>Bem-vindo ao Lanchonete App</h1>
            <p>Vamos configurar sua lanchonete</p>
            <form onSubmit={handleNomeSubmit}>
              <div className="form-group">
                <label>Nome da Lanchonete</label>
                <input
                  type="text"
                  placeholder="ex: Lanches da Maria"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary">
                Próximo
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Cadastre seus Produtos</h2>
            <form onSubmit={handleProdutosSubmit}>
              <div className="produtos-list">
                {produtos.map((produto, index) => (
                  <div key={index} className="produto-row">
                    <input
                      type="text"
                      placeholder="Nome do produto"
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
                      value={produto.preco}
                      onChange={(e) =>
                        handleProdutoChange(index, 'preco', e.target.value)
                      }
                    />
                    {produtos.length > 1 && (
                      <button
                        type="button"
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
                type="button"
                className="btn-secondary"
                onClick={handleAdicionarProduto}
              >
                + Adicionar Produto
              </button>
              <button type="submit" className="btn-primary">
                Próximo
              </button>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Formas de Pagamento</h2>
            <div className="pagamentos-list">
              {Object.keys(pagamentos).map((tipo) => (
                <label key={tipo} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={pagamentos[tipo]}
                    onChange={() => handlePagamentoChange(tipo)}
                  />
                  <span>{tipo}</span>
                </label>
              ))}
            </div>
            <button type="button" className="btn-primary" onClick={handleComplete}>
              Começar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
