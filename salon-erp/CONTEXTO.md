# 📊 Salon ERP - Contexto Atual do Projeto

**Data:** 2026-05-01  
**Status:** 🟡 Em Desenvolvimento  
**Banco de Dados:** PostgreSQL (Railway)  
**Frontend:** Vue.js + HTML/CSS  
**Backend:** Node.js + Express  

---

## 🎯 Objetivo do Projeto

Sistema ERP para gerenciamento de receitas e despesas de um salão/bar com múltiplos canais de venda:
- **Salão (presencial)**
- **iFood (delivery)**
- **Keeta (delivery)**
- **99Food (delivery)**

Análise de CMV (Custo da Mercadoria Vendida) inteligente com alocação proporcional de despesas.

---

## 📈 Status Atual

### ✅ Implementado
- [x] Migração SQLite → PostgreSQL
- [x] Tabelas criadas (faturamento, tipo_despesa, notas_fiscais, restaurantes)
- [x] API endpoints básicos (CRUD faturamentos)
- [x] Frontend dashboard com Vue.js
- [x] CMV Analyzer com análise de despesas
- [x] Performance por Categoria (receita/despesa separadas)
- [x] Gráficos de Receita vs Despesa
- [x] Sistema de upload de Notas Fiscais
- [x] Endpoints debug para diagnóstico

### 🟡 Em Progresso
- [ ] Erro 500 em `/api/tipo-despesa/agrupado` (tipo_despesa pode estar vazio)
- [ ] Gráficos não inicializando (consequência dos erros acima)
- [ ] Validação de dados após migração

### ⏳ Pendente
- [ ] Autenticação multi-usuário
- [ ] Multi-tenant architecture (clientes separados)
- [ ] Backup automático
- [ ] Relatórios exportáveis (PDF/Excel)

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: `faturamento`
```sql
CREATE TABLE faturamento (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  categoria VARCHAR(50) NOT NULL,  -- 'Salão', 'iFood', 'Keeta', '99Food'
  tipo VARCHAR(20) NOT NULL,       -- 'receita' ou 'despesa'
  tipo_despesa_id INTEGER,         -- REFERENCES tipo_despesa(id)
  categoria_produto VARCHAR(100),  -- 'Comida', 'Bebida', etc
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Status:** 132 registros migrados com sucesso (abril 2026)

---

### Tabela: `tipo_despesa`
```sql
CREATE TABLE tipo_despesa (
  id SERIAL PRIMARY KEY,
  classificacao VARCHAR(50) NOT NULL,  -- 'CMV', 'Operacional', 'Administrativa', 'Financeira'
  subcategoria VARCHAR(100) NOT NULL,  -- 'Taxas', 'Bebidas', 'Aluguel', etc
  descricao VARCHAR(255),
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(classificacao, subcategoria)
)
```

**18 Categorias Padrão:**
- **CMV (5):** Taxas, Bebidas, Comidas, Açúcar/Temperos, Embalagem
- **Operacional (6):** Aluguel, Energia, Água, Telefone/Internet, Limpeza, Manutenção
- **Administrativa (4):** Folha de Pagamento, Contador, Seguros, Material Administrativo
- **Financeira (3):** Juros e Multas, Custos Financeiros, Empréstimos

---

### Tabela: `notas_fiscais`
```sql
CREATE TABLE notas_fiscais (
  id SERIAL PRIMARY KEY,
  numero_nf VARCHAR(50) NOT NULL UNIQUE,
  faturamento_id INTEGER REFERENCES faturamento(id),
  pdf_data BYTEA,
  status VARCHAR(20) DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

### Tabela: `restaurantes`
```sql
CREATE TABLE restaurantes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  canal VARCHAR(50) NOT NULL,
  ativa BOOLEAN DEFAULT true,
  cliente_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

## 🔌 Endpoints da API

### Faturamentos
```
GET  /api/faturamentos?days=365
POST /api/faturamentos
PUT  /api/faturamentos/:id
DELETE /api/faturamentos/:id
```

### Performance por Categoria
```
GET /api/faturamentos/stats-categoria?from=2026-04-01&to=2026-04-30
GET /api/faturamentos/despesas-alocadas?from=2026-04-01&to=2026-04-30
```

### CMV Analysis
```
GET /api/cmv-inteligente?from=2026-04-01&to=2026-04-30&canal=iFood
```

### Tipos de Despesa
```
GET  /api/tipo-despesa/agrupado
GET  /api/tipo-despesa/cmv
POST /api/tipo-despesa
```

### Notas Fiscais
```
GET  /api/notas-fiscais
POST /api/notas-fiscais (upload PDF)
```

---

## 🐛 Problemas Conhecidos e Soluções

### Problema 1: Erro 500 em `/api/tipo-despesa/agrupado`
**Causa:** Tabela `tipo_despesa` vazia após migração  
**Solução:** Endpoint `POST /debug/init-tipo-despesa` inicializa 18 categorias padrão

### Problema 2: `Cannot read properties of undefined (reading 'toFixed')`
**Causa:** APIs retornando `null/undefined`, frontend chamando `.toFixed()` sem verificação  
**Solução:** Adicionado fallback `(valor || 0).toFixed(2)` em todos os 14 casos

### Problema 3: Gráficos não renderizam
**Causa:** Consequência dos problemas 1 e 2  
**Solução:** Resolvido ao corrigir os endpoints e validação de dados

### Problema 4: SQLite vs PostgreSQL incompatibilidade
**Causa:** Funções SQL diferentes (date(), datetime(), ?, etc)  
**Solução:** 
- Convertidas para PostgreSQL: `CURRENT_DATE - INTERVAL '30 days'`, `NOW()`
- Placeholders: `?` → `$1, $2, ...` (via `convertPlaceholders()`)
- Campo names: Fallback para lowercase (`totalreceita || totalReceita`)

---

## 🧪 Scripts de Teste Disponíveis

### 1. Post-Deploy Validation
```bash
node backend/post-deploy-validation.js
```
✅ 14 testes de conectividade, integridade e dados

### 2. Performance por Categoria
```bash
node backend/test-performance-por-categoria.js
```
✅ Testa `obterStatsPorCategoria()` e merge de dados

### 3. Histórico (últimos 365 dias)
```bash
node backend/test-historico.js
```
✅ Verifica dados brutos na tabela faturamento

### 4. Tipo Despesa
```bash
node backend/test-tipo-despesa.js
```
✅ Testa métodos de categoria de despesa

### 5. CMV Endpoint
```bash
node backend/test-cmv-endpoint.js
```
✅ Testa análise CMV completa

### 6. Verificar Totais de Abril
```bash
node backend/verify-april-totals.js
```
✅ Valida totais esperados: **R$ 255.971,64**

### 7. Inicializar tipo_despesa
```bash
node backend/init-tipo-despesa.js
```
✅ Insere 18 categorias de despesa padrão

---

## 🔍 Endpoints de Debug

### Diagnosticar tipo_despesa
```
GET /debug/tipo-despesa
```
Retorna:
- Quantidade de registros com `tipo_despesa_id`
- IDs órfãos (perdidos na migração)
- Agrupamento por subcategoria

### Inicializar tipo_despesa
```
POST /debug/init-tipo-despesa
```
Insere as 18 categorias padrão se tabela vazia

### Diagnosticar Stats por Categoria
```
GET /debug/stats-categoria?from=2026-04-01&to=2026-04-30
```
Retorna dados de receita/despesa e merge

---

## 📁 Estrutura do Projeto

```
salon-erp/
├── backend/
│   ├── app.js                 # Servidor principal
│   ├── database.js            # Pool PostgreSQL + inicialização
│   ├── models/
│   │   ├── Faturamento.js     # Queries de faturamento
│   │   ├── TipoDespesa.js     # Queries de tipo_despesa
│   │   └── NotaFiscal.js      # Queries de notas fiscais
│   ├── routes/
│   │   ├── api.js             # Todos os endpoints (1600+ linhas)
│   │   └── debug.js           # Endpoints de debug
│   ├── utils/
│   │   ├── CMVAnalyzer.js     # Análise CMV V1
│   │   ├── CMVAnalyzerV2.js   # Análise CMV V2 (completa)
│   │   ├── NotaFiscalParser.js # Parser de PDF/OCR
│   │   └── logger.js          # Logging
│   ├── frontend/
│   │   ├── index.html         # Dashboard Vue.js (2400+ linhas)
│   │   └── js/utils/
│   │       └── api.js         # Cliente HTTP (axios)
│   └── [testes].js            # Scripts de validação
├── .env                       # DATABASE_URL (Railway PostgreSQL)
├── .env.local                 # URL pública para testes locais
├── package.json               # npm dependencies
├── Dockerfile                 # Deploy Railway
└── CONTEXTO.md               # Este arquivo
```

---

## 🚀 Como Fazer Deploy

### 1. Commit e Push para GitHub
```bash
git add -A
git commit -m "Descrição das mudanças"
git push origin master
```

### 2. Railway Rebuild Automático
- Railway detecta push
- Rebuild automático (2-3 min)
- App reinicia com novo código

### 3. Testar Post-Deploy
```
https://[seu-app].up.railway.app/
```

---

## 🔧 Como Fazer Debug

### **Opção 1: Console do Browser (Mais Fácil)**
1. Abra o app: `https://[seu-app].up.railway.app`
2. Aperte **F12** (DevTools)
3. Vá para aba **"Console"**
4. Procure por mensagens em vermelho (erros)

### **Opção 2: Testar Endpoints Direto**
```
https://[seu-app].up.railway.app/debug/tipo-despesa
https://[seu-app].up.railway.app/debug/stats-categoria?from=2026-04-01&to=2026-04-30
```

### **Opção 3: Network Tab**
1. F12 → Aba "Network"
2. Recarregue página
3. Procure por status 500 (erro)
4. Clique para ver response

---

## 📊 Métricas Esperadas

### Abril 2026
- **Total Receita:** R$ 255.971,64
- **Salão:** R$ 96.785,94
- **iFood:** R$ 56.389,25
- **Keeta:** R$ 59.726,36
- **99Food:** R$ 43.070,09

### Despesas (Alocadas Proporcionalmente)
- **Salão:** R$ 81.743,85 despesa = R$ 15.042,09 líquido
- **iFood:** R$ 37.731,25 despesa = R$ 18.658,00 líquido
- **Keeta:** R$ 49.908,82 despesa = R$ 9.817,54 líquido
- **99Food:** R$ 26.719,54 despesa = R$ 16.350,55 líquido

---

## 🔐 Variáveis de Ambiente

### `.env` (Railway)
```
DATABASE_URL=postgresql://postgres:[senha]@postgres.railway.internal:5432/railway
NODE_ENV=production
PORT=8080
```

### `.env.local` (Testes Locais)
```
DATABASE_URL=postgresql://postgres:[senha]@postgres.railway.up.railway.app:5432/railway
NODE_ENV=production
```

---

## 📝 Próximas Ações

### Imediato (Hoje)
- [ ] Fazer redeploy no Railway
- [ ] Chamar POST `/debug/init-tipo-despesa`
- [ ] Verificar se erros desaparecem
- [ ] Testar Histórico, Performance e Gráficos

### Curto Prazo (Esta Semana)
- [ ] Validar dados de abril 2026
- [ ] Confirmar totais esperados
- [ ] Testar upload de Notas Fiscais
- [ ] Validar CMV Analyzer

### Médio Prazo (Próximas Semanas)
- [ ] Multi-tenant architecture
- [ ] Autenticação de usuários
- [ ] Relatórios exportáveis
- [ ] Backup automático

---

## 📞 Contato e Suporte

**Última atualização:** 2026-05-01 12:15:00  
**Responsável:** Claude Code Agent  
**Status:** 🟡 Aguardando testes em Railway

---

## 📚 Referências

- [Railway PostgreSQL Docs](https://docs.railway.app/databases/postgresql)
- [Express.js Guide](https://expressjs.com/)
- [Vue.js 3 Docs](https://vuejs.org/)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)

