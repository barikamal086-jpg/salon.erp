# Plano de Desenvolvimento: Salon ERP Module 1 (Lançamento de Faturamento)

## 📌 CONTEXTO

**Projeto:** Salon ERP - MVP Module 1 (Lançamento de Faturamento)
**Usuário:** Kamal (Salão de beleza)
**Objetivo:** Web app profissional para lançar receitas diárias, visualizar histórico, editar/deletar, ver KPIs e gráficos

**Situação Atual:**
- ✅ Briefing completo disponível
- ✅ Script Python de automação Conta Azul (lancar-receitas) já existe
- ✅ Parser WhatsApp em Python pronto
- ✅ Skills configurados (lancar-receita-diaria, processar-notas-fiscais)
- ❌ Web app (frontend + backend + database) não existe ainda

**Stack Escolhido:**
- **Frontend:** Vue.js (simples, responsivo)
- **Backend:** Express.js + SQLite (rápido de prototipar)
- **Deploy:** Local por enquanto (Railway/Heroku depois)

---

## 🎯 ESCOPO FINAL DO MVP

### Funcionalidades Core:
1. **Formulário Lançamento** → Data + Total → Validar → Salvar BD
2. **Tabela Histórico** → Últimos 30 dias → Colunas: Data | Total | Status | Ações
3. **Ações na Tabela** → Editar (update total) | Deletar | Filtro por Status
4. **5 KPIs Dinâmicos** → Total Período | Média Diária | Maior | Menor | Dias
5. **Gráfico Line Chart** → Faturamento diário → Atualiza com período dos KPIs
6. **Integração Conta Azul** → Botão "Enviar ao Conta Azul" → Marca como enviado

---

## 🛠️ ARQUITETURA GERAL

```
salon-erp/
├── backend/
│   ├── app.js                 # Express server principal
│   ├── database.js            # Configuração SQLite + migrations
│   ├── routes/
│   │   └── api.js            # GET/POST/PUT/DELETE faturamentos
│   ├── controllers/
│   │   └── faturamento.js    # Lógica de negócio
│   ├── models/
│   │   └── Faturamento.js    # ORM/queries
│   ├── package.json
│   └── salon-erp.db          # Database SQLite
│
├── frontend/
│   ├── index.html            # Layout principal
│   ├── css/
│   │   └── style.css         # Tailwind CSS
│   ├── js/
│   │   ├── app.js            # Vue app instance
│   │   ├── components/
│   │   │   ├── FormLancamento.vue
│   │   │   ├── TabelaHistorico.vue
│   │   │   ├── KPIs.vue
│   │   │   └── GraficoTendencia.vue
│   │   └── utils/
│   │       └── api.js        # Chamadas HTTP
│   └── package.json
│
└── README.md                  # Documentação
```

---

## 📋 PLANO DE IMPLEMENTAÇÃO (Fases)

### FASE 1: Setup Inicial & Database
**Objetivo:** Estrutura base, DB pronta, API básica

**Tarefas:**
1. Criar pasta `salon-erp/` com subpastas backend + frontend
2. **Backend:**
   - `npm init` + instalar: express, sqlite3, cors, body-parser
   - Criar `database.js` com schema: tabela `faturamento`
   - Criar `app.js` com Express server básico (port 5000)
   - Criar `routes/api.js` com endpoints CRUD (GET, POST, PUT, DELETE)
   - Criar `models/Faturamento.js` com queries SQL
3. **Frontend:**
   - `npm init` + instalar: vue, axios, chart.js
   - Criar `index.html` com estrutura básica (Tailwind CDN)
   - Criar `app.js` com Vue instance raiz
4. **Validar:** Backend responde em http://localhost:5000/api/faturamentos

### FASE 2: Formulário de Lançamento (Frontend)
**Objetivo:** Componente FormLancamento funcional

**Tarefas:**
1. Criar `components/FormLancamento.vue`
   - Inputs: data (padrão: hoje) + total (number, required)
   - Validações: data não futura, total > 0
   - Botão "Salvar" → POST /api/faturamentos
   - Feedback: mensagem sucesso/erro
2. Integrar ao `app.js` (Vue root)
3. Testar: Lançar receita → Verificar BD (sqlite3 CLI)

### FASE 3: Tabela Histórico (Frontend)
**Objetivo:** Exibir últimos 30 dias com ações

**Tarefas:**
1. Criar `components/TabelaHistorico.vue`
   - GET /api/faturamentos?days=30 (backend)
   - Render tabela: Data | Total | Status | Ações (Editar | Deletar)
   - Ícones/botões simples (Bootstrap icons ou emoji)
2. Ações:
   - **Editar:** Modal com novo total → PUT /api/faturamentos/:id
   - **Deletar:** Confirmação → DELETE /api/faturamentos/:id
3. Testar: Criar → Editar → Deletar funciona

### FASE 4: KPIs Dinâmicos (Frontend)
**Objetivo:** 5 métricas com picker de período

**Tarefas:**
1. Criar `components/KPIs.vue`
   - Picker: data início + data fim
   - API: GET /api/faturamentos/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
   - Cards com: Total | Média | Maior | Menor | Dias
   - Formatação: BRL (R$ 1.234,56)
2. Backend (`models/Faturamento.js`):
   - Função `getStats(fromDate, toDate)` com cálculos SQL
3. Testar: Mudar período → KPIs atualizam

### FASE 5: Gráfico de Tendência (Frontend)
**Objetivo:** Line chart interativo com Chart.js

**Tarefas:**
1. Criar `components/GraficoTendencia.vue`
   - Chart.js com Vue wrapper (vue-chartjs ou manual)
   - Dados: GET /api/faturamentos/chart?from=YYYY-MM-DD&to=YYYY-MM-DD
   - X-axis: datas | Y-axis: totais
   - Hover: mostra valor dia + data
2. Listener: Quando KPIs mudam período → Gráfico re-renderiza
3. Testar: Mudar período nos KPIs → Gráfico atualiza

### FASE 6: Filtro por Status
**Objetivo:** Filtrar tabela por Pendente/Enviado/Todos

**Tarefas:**
1. Adicionar dropdown na TabelaHistorico
   - Opções: Todos | Pendente (status=false) | Enviado (status=true)
   - GET /api/faturamentos?days=30&status=pending (ou sent)
2. Backend: Adicionar query param filtering
3. Testar: Filtrar funciona

### FASE 7: Integração Conta Azul
**Objetivo:** Botão "Enviar ao Conta Azul" usando skill lancar-receitas

**Tarefas:**
1. Adicionar botão na tabela/linha: "Enviar ao Conta Azul"
2. Frontend:
   - POST /api/faturamentos/:id/enviar-conta-azul
   - Backend chama skill `lancar-receitas` via CLI/API
3. Backend:
   - Endpoint recebe ID receita
   - Chama skill `lancar-receitas` com data + total
   - Se sucesso: UPDATE status=true, enviado_em=now()
   - Retorna feedback
4. Testar: Clicar botão → Marca como enviado → Status muda na tabela

### FASE 8: Responsividade & Polish
**Objetivo:** Layout mobile + desktop + UX

**Tarefas:**
1. Tailwind CSS:
   - Mobile first (sm, md, lg breakpoints)
   - Formulário responsivo
   - Tabela com scroll horizontal em mobile
   - KPIs em grid (1 col mobile, 5 cols desktop)
2. Validações frontend + backend duplicadas
3. Loading states (spinners, disabled buttons)
4. Erro handling (try-catch, user feedback)

---

## 🗄️ SCHEMA DATABASE (SQLite)

```sql
CREATE TABLE faturamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data DATE UNIQUE NOT NULL,
  total DECIMAL(10,2) NOT NULL CHECK(total > 0),
  status BOOLEAN DEFAULT 0,
  enviado_em TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data ON faturamento(data DESC);
CREATE INDEX idx_status ON faturamento(status);
CREATE INDEX idx_created ON faturamento(created_at DESC);
```

---

## 🔌 API ENDPOINTS

### Backend (Express)

| Method | Endpoint | Descrição | Params |
|--------|----------|-----------|--------|
| GET | `/api/faturamentos` | Lista receitas | ?days=30, ?status=pending/sent |
| POST | `/api/faturamentos` | Cria receita | body: {data, total} |
| PUT | `/api/faturamentos/:id` | Edita receita | body: {total} |
| DELETE | `/api/faturamentos/:id` | Deleta receita | - |
| GET | `/api/faturamentos/stats` | KPIs | ?from=YYYY-MM-DD&to=YYYY-MM-DD |
| GET | `/api/faturamentos/chart` | Gráfico dados | ?from=YYYY-MM-DD&to=YYYY-MM-DD |
| POST | `/api/faturamentos/:id/enviar-conta-azul` | Enviar ao Conta Azul | - |

---

## ✅ CRITÉRIO DE ACEITAÇÃO (Verificação)

Após cada fase, testar:
- ✅ Formulário salva receita + validações
- ✅ Tabela mostra últimos 30 dias + editar/deletar
- ✅ KPIs calculam corretamente com período customizado
- ✅ Gráfico renderiza e atualiza ao mudar período
- ✅ Filtro por status funciona
- ✅ Botão "Enviar ao Conta Azul" marca como enviado
- ✅ Dados persistem após reload
- ✅ Layout responsivo (mobile 375px + desktop 1280px)
- ✅ Nenhuma erro no console browser/server
- ✅ API retorna status corretos (200, 201, 400, 404, 500)

---

## 📅 TIMELINE ESTIMADA

- **FASE 1:** 1-2h (setup + DB)
- **FASE 2:** 1-1.5h (form)
- **FASE 3:** 1-1.5h (tabela)
- **FASE 4:** 1h (KPIs)
- **FASE 5:** 1-1.5h (gráfico)
- **FASE 6:** 30min (filtro)
- **FASE 7:** 1-2h (integração Conta Azul)
- **FASE 8:** 1-2h (responsividade + polish)

**Total:** 8-12h (2-3 dias de desenvolvimento)

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Confirmar plano (este documento)
2. 🔨 Iniciar FASE 1: Setup + Database
3. 📝 Cada fase entrega código funcional + teste
4. 🎉 Final: MVP pronto para uso local (depois deploy Railway)

---

## 📝 NOTAS IMPORTANTES

- **Reuso de código:** Skills `lancar-receitas` existentes serão integrados (não reinventar)
- **Simplicidade:** Vue simples (não precisa Vuex, apenas props/emits)
- **Dados:** SQLite local (upgrade para PostgreSQL/Railway depois)
- **Segurança:** Usuário único por enquanto (autenticação adicionada depois)
- **Conta Azul:** Integração via skill existente (Playwright automation)

---

**Status:** ✅ Pronto para iniciar desenvolvimento
**Data Criação:** 2026-04-11

---

# FASE ADICIONAL: Adicionar Campo de Categoria

## 📌 CONTEXTO
O usuário quer rastrear receitas por fonte/canal: **Salão presencial**, **iFood**, **99Food** e **Keepa Food**. Atualmente o sistema só armazena Data e Total, sem diferenciar a origem da receita.

## 🎯 REQUISITOS
1. **Categorias:** Dropdown com pré-definidas (Salão, iFood, 99Food, Keepa) + opção "Outra" para digitar categoria customizada
2. **Visualização:** KPIs separados por categoria (ex: Total Salão: R$X, Total iFood: R$Y)
3. **Validação:** Categoria é campo obrigatório (não pode lançar receita sem selecionar)
4. **Tabela:** Adicionar coluna de categoria com visual diferenciado (badges com cores)

## 🛠️ IMPLEMENTAÇÃO

### 1. Database - Adicionar Coluna
**Arquivo:** `C:\Users\bari.NTMAD243\salon-erp\backend\database.js`

Modificar `CREATE TABLE faturamento`:
```javascript
// Adicionar depois de 'updated_at':
categoria VARCHAR(50) NOT NULL DEFAULT 'Salão'
```

Adicionar índice:
```javascript
CREATE INDEX IF NOT EXISTS idx_categoria ON faturamento(categoria)
```

### 2. Modelo - Novos Métodos
**Arquivo:** `C:\Users\bari.NTMAD243\salon-erp\backend\models\Faturamento.js`

**Modificar:**
- `criar(data, total, categoria)` - aceitar categoria como parâmetro

**Novo método - obterStatsPorCategoria:**
```javascript
static async obterStatsPorCategoria(dataInicio, dataFim) {
  const sql = `
    SELECT
      categoria,
      COALESCE(SUM(total), 0) as total,
      COALESCE(AVG(total), 0) as media,
      COALESCE(MAX(total), 0) as maior,
      COALESCE(MIN(total), 0) as menor,
      COUNT(*) as dias
    FROM faturamento
    WHERE data >= ? AND data <= ?
    GROUP BY categoria
    ORDER BY total DESC
  `;
  return await allAsync(sql, [dataInicio, dataFim]);
}
```

### 3. API - Novos Endpoints
**Arquivo:** `C:\Users\bari.NTMAD243\salon-erp\backend\routes\api.js`

**Modificar POST `/api/faturamentos`:**
- Extrair `categoria` do body
- Validar que categoria foi fornecida
- Passar para `Faturamento.criar(data, total, categoria)`

**Novo GET `/api/faturamentos/stats-categoria`:**
```javascript
router.get('/faturamentos/stats-categoria', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "from" e "to" são obrigatórios'
      });
    }

    const stats = await Faturamento.obterStatsPorCategoria(from, to);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 4. Cliente API - Novos Métodos
**Arquivo:** `C:\Users\bari.NTMAD243\salon-erp\frontend\js\utils\api.js`

**Modificar:**
- `criarFaturamento(data, total, categoria)` - passar categoria como parâmetro

**Novo:**
```javascript
obterStatsPorCategoria(from, to) {
  return axios.get(`${API_BASE}/faturamentos/stats-categoria?from=${from}&to=${to}`);
}
```

### 5. Frontend - UI e Lógica
**Arquivo:** `C:\Users\bari.NTMAD243\salon-erp\frontend\index.html`

**No data():**
```javascript
novaReceita: {
  data: new Date().toISOString().split('T')[0],
  total: null,
  categoria: 'Salão'  // NOVO
},

categoriasDisponiveis: ['Salão', 'iFood', '99Food', 'Keepa'],  // NOVO
outraCategoria: '',  // NOVO
```

**No formulário "Lançar Faturamento" (adicionar após campo Total):**
```html
<!-- NOVO: Seletor de Categoria -->
<div class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
  <select 
    v-model="novaReceita.categoria" 
    required
    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">Selecione uma categoria...</option>
    <option v-for="cat in categoriasDisponiveis" :key="cat" :value="cat">
      {{ cat }}
    </option>
    <option value="outra">Outra (especificar)</option>
  </select>
</div>

<!-- Campo adicional se "Outra" selecionada -->
<div v-if="novaReceita.categoria === 'outra'" class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-2">Informe a categoria</label>
  <input 
    v-model="outraCategoria" 
    type="text"
    placeholder="Ex: Marketplace X"
    required
    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
</div>
```

**Modificar `salvarReceita()`:**
```javascript
async salvarReceita() {
  if (!this.novaReceita.data || !this.novaReceita.total) {
    alert('Preecha Data e Total');
    return;
  }
  
  // Validar categoria obrigatória
  if (!this.novaReceita.categoria) {
    alert('Selecione uma categoria');
    return;
  }
  
  // Se "Outra", validar preenchimento
  if (this.novaReceita.categoria === 'outra' && !this.outraCategoria) {
    alert('Informe o nome da categoria');
    return;
  }
  
  const categoria = this.novaReceita.categoria === 'outra' 
    ? this.outraCategoria 
    : this.novaReceita.categoria;
  
  try {
    await api.criarFaturamento(this.novaReceita.data, this.novaReceita.total, categoria);
    this.novaReceita = { 
      data: new Date().toISOString().split('T')[0], 
      total: null, 
      categoria: 'Salão' 
    };
    this.outraCategoria = '';
    this.atualizarPeriodo();
  } catch (error) {
    alert('Erro ao salvar: ' + error.message);
  }
}
```

**Novo método `carregarStatsPorCategoria()`:**
```javascript
async carregarStatsPorCategoria() {
  try {
    console.log('📊 Carregando stats por categoria:', {
      dataInicio: this.periodo.dataInicio,
      dataFim: this.periodo.dataFim
    });
    const response = await api.obterStatsPorCategoria(this.periodo.dataInicio, this.periodo.dataFim);
    if (response.data.success) {
      this.statsPorCategoria = response.data.data;
      console.log('✅ Stats por categoria recebido:', this.statsPorCategoria);
    }
  } catch (error) {
    console.error('Erro ao carregar stats por categoria:', error);
  }
}
```

**Chamar em `atualizarPeriodo()`:**
```javascript
async atualizarPeriodo() {
  console.log('🔄 Atualizando período:', {
    dataInicio: this.periodo.dataInicio,
    dataFim: this.periodo.dataFim
  });
  await this.carregarStats();
  await this.carregarStatsPorCategoria();  // NOVO
  await this.carregarGrafico();
  await this.carregarReceitas();
}
```

**Seção KPIs - Substituir cards únicos por cards por categoria:**

Usar grid layout que renderize cada categoria:
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div v-for="cat in statsPorCategoria" :key="cat.categoria" class="bg-white rounded-lg shadow-md p-6 border-l-4" :class="{
    'border-blue-500': cat.categoria === 'Salão',
    'border-red-500': cat.categoria === 'iFood',
    'border-yellow-500': cat.categoria === '99Food',
    'border-green-500': cat.categoria === 'Keepa',
    'border-purple-500': cat.categoria !== 'Salão' && cat.categoria !== 'iFood' && cat.categoria !== '99Food' && cat.categoria !== 'Keepa'
  }">
    <div class="text-sm font-medium text-gray-600 mb-2">{{ cat.categoria }}</div>
    <div class="text-2xl font-bold text-gray-900">R$ {{ cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</div>
    <div class="text-xs text-gray-500 mt-2">
      {{ cat.dias }} dias | Média: R$ {{ (cat.media).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }}
    </div>
  </div>
</div>
```

**Tabela Histórico - Adicionar coluna CATEGORIA:**

Adicionar após coluna DATA:
```html
<td class="px-6 py-4 whitespace-nowrap">
  <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full" :class="{
    'bg-blue-100 text-blue-800': r.categoria === 'Salão',
    'bg-red-100 text-red-800': r.categoria === 'iFood',
    'bg-yellow-100 text-yellow-800': r.categoria === '99Food',
    'bg-green-100 text-green-800': r.categoria === 'Keepa',
    'bg-purple-100 text-purple-800': r.categoria !== 'Salão' && r.categoria !== 'iFood' && r.categoria !== '99Food' && r.categoria !== 'Keepa'
  }">
    {{ r.categoria }}
  </span>
</td>
```

**No data():**
```javascript
statsPorCategoria: []  // NOVO
```

## ✅ VERIFICAÇÃO

- [x] Lançar receita com categoria "Salão" → aparece no histórico
- [x] Lançar receita com categoria "iFood" → aparece no histórico
- [x] Lançar receita com categoria "Outra" e digitar "Marketplace X" → aparece no histórico
- [x] KPIs mostram totais separados por categoria (cards lado a lado)
- [x] Tabela mostra coluna de categoria com cores diferentes
- [x] Não conseguir lançar sem categoria (campo obrigatório)
- [x] Período selecionado filtra corretamente (KPIs e tabela)
- [x] Gráfico continua mostrando tendência geral (não separado por categoria, por enquanto)

## 📝 NOTAS

- Cores por categoria: Salão (azul), iFood (vermelho), 99Food (amarelo), Keepa (verde), Outra (roxo)
- KPIs por categoria podem ser expandidos com:
  - Gráfico de pizza por categoria
  - Filtro "mostrar apenas categoria X"
  - Ranking de categorias mais rentáveis
- A opção "Outra" permite adicionar categorias customizadas sem necessidade de alterar o código
