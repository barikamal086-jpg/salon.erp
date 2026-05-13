export function Menu({ activeTab, onTabChange, onReset }) {
  return (
    <nav className="menu">
      <div className="menu-tabs">
        <button
          className={`menu-tab ${activeTab === 'vendas' ? 'active' : ''}`}
          onClick={() => onTabChange('vendas')}
        >
          Vendas
        </button>
        <button
          className={`menu-tab ${activeTab === 'despesas' ? 'active' : ''}`}
          onClick={() => onTabChange('despesas')}
        >
          Despesas
        </button>
        <button
          className={`menu-tab ${activeTab === 'relatorio' ? 'active' : ''}`}
          onClick={() => onTabChange('relatorio')}
        >
          Relatório
        </button>
        <button
          className={`menu-tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => onTabChange('config')}
        >
          Configurações
        </button>
      </div>
    </nav>
  );
}
