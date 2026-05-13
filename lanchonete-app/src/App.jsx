import { useState } from 'react';
import { Onboarding } from './components/Onboarding.jsx';
import { Menu } from './components/Menu.jsx';
import { VendasDiarias } from './components/VendasDiarias.jsx';
import { Despesas } from './components/Despesas.jsx';
import { Relatorio } from './components/Relatorio.jsx';
import { Configuracoes } from './components/Configuracoes.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { saveData } from './utils/storage.js';
import './App.css';

function App() {
  const defaultData = {
    lanchonete: { nome: '' },
    produtos: [],
    pagamentos: [],
    vendas: [],
    despesas: []
  };

  const [data, setData, isLoaded] = useLocalStorage(defaultData);
  const [activeTab, setActiveTab] = useState('vendas');
  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toISOString().split('T')[0]
  );

  if (!isLoaded) {
    return <div className="loading">Carregando...</div>;
  }

  const isConfigured = data.lanchonete.nome && data.produtos.length > 0 && data.pagamentos.length > 0;

  if (!isConfigured) {
    return (
      <Onboarding
        onComplete={(configData) => {
          setData(configData);
        }}
      />
    );
  }

  const handleAdicionarVenda = ({
    data: dataVenda,
    turno,
    quantidade,
    produtoId,
    nomeProduto,
    preco,
    formaPagamento
  }) => {
    const dataClone = { ...data };

    // Verificar se já existe venda para essa data e turno
    let vendaExistente = dataClone.vendas.find(
      (v) => v.data === dataVenda && v.turno === turno
    );

    if (!vendaExistente) {
      vendaExistente = {
        id: 'venda_' + Date.now() + '_' + Math.random(),
        data: dataVenda,
        turno,
        itens: []
      };
      dataClone.vendas.push(vendaExistente);
    }

    // Adicionar item à venda
    vendaExistente.itens.push({
      id: 'item_' + Date.now() + '_' + Math.random(),
      produtoId,
      nomeProduto,
      preco,
      quantidade,
      formaPagamento,
      subtotal: quantidade * preco
    });

    setData(dataClone);
  };

  const handleEditarVenda = (vendaId, vendaAtualizada) => {
    const dataClone = { ...data };
    const vendaIndex = dataClone.vendas.findIndex((v) => v.id === vendaId);
    if (vendaIndex !== -1) {
      dataClone.vendas[vendaIndex] = vendaAtualizada;
      setData(dataClone);
    }
  };

  const handleDeletarVenda = (vendaId, itemIndex) => {
    const dataClone = { ...data };
    const vendaIndex = dataClone.vendas.findIndex((v) => v.id === vendaId);
    if (vendaIndex !== -1) {
      dataClone.vendas[vendaIndex].itens.splice(itemIndex, 1);

      // Se não há mais itens, deletar a venda
      if (dataClone.vendas[vendaIndex].itens.length === 0) {
        dataClone.vendas.splice(vendaIndex, 1);
      }

      setData(dataClone);
    }
  };

  const handleAdicionarDespesa = ({ data: dataDespesa, descricao, valor, categoria, formaPagamento }) => {
    const dataClone = { ...data };
    dataClone.despesas.push({
      id: 'despesa_' + Date.now() + '_' + Math.random(),
      data: dataDespesa,
      descricao,
      valor,
      categoria,
      formaPagamento
    });
    setData(dataClone);
  };

  const handleEditarDespesa = (despesaId, despesaAtualizada) => {
    const dataClone = { ...data };
    const despesaIndex = dataClone.despesas.findIndex((d) => d.id === despesaId);
    if (despesaIndex !== -1) {
      dataClone.despesas[despesaIndex] = despesaAtualizada;
      setData(dataClone);
    }
  };

  const handleDeletarDespesa = (despesaId) => {
    const dataClone = { ...data };
    dataClone.despesas = dataClone.despesas.filter((d) => d.id !== despesaId);
    setData(dataClone);
  };

  const handleAtulizarConfig = ({ lanchonete, produtos, pagamentos }) => {
    const dataClone = { ...data };
    dataClone.lanchonete = lanchonete;
    dataClone.produtos = produtos;
    dataClone.pagamentos = pagamentos;
    setData(dataClone);
  };

  const handleReset = () => {
    setData(defaultData);
    setActiveTab('vendas');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>{data.lanchonete.nome}</h1>
      </header>

      <Menu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReset={handleReset}
      />

      <main className="app-main">
        {activeTab === 'vendas' && (
          <VendasDiarias
            data={dataSelecionada}
            onDataChange={setDataSelecionada}
            produtos={data.produtos}
            pagamentos={data.pagamentos}
            vendas={data.vendas}
            onAdicionarVenda={handleAdicionarVenda}
            onEditarVenda={handleEditarVenda}
            onDeletarVenda={handleDeletarVenda}
          />
        )}

        {activeTab === 'despesas' && (
          <Despesas
            data={dataSelecionada}
            onDataChange={setDataSelecionada}
            despesas={data.despesas}
            onAdicionarDespesa={handleAdicionarDespesa}
            onEditarDespesa={handleEditarDespesa}
            onDeletarDespesa={handleDeletarDespesa}
          />
        )}

        {activeTab === 'relatorio' && (
          <Relatorio
            lanchonete={data.lanchonete}
            data={dataSelecionada}
            onDataChange={setDataSelecionada}
            produtos={data.produtos}
            pagamentos={data.pagamentos}
            vendas={data.vendas}
            despesas={data.despesas}
          />
        )}

        {activeTab === 'config' && (
          <Configuracoes
            lanchonete={data.lanchonete}
            produtos={data.produtos}
            pagamentos={data.pagamentos}
            onAtualizar={handleAtulizarConfig}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

export default App;
