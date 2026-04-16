---
name: Salon ERP Project Status
description: Current state of Salon ERP development - modules, infrastructure, recent fixes
type: project
---

# 🍽️ Salon ERP - Status Completo (2026-04-14)

## ✅ Módulos Implementados

### 1. **Dashboard Faturamento** - MVP Completo
- Lançamento receitas (Salão, iFood, 99Food, Keepa)
- Tabela histórico com editar/deletar
- KPIs dinâmicos por período
- Gráfico de Tendência (AGORA COM RECEITAS E DESPESAS)
- Integração Conta Azul

### 2. **Processamento Notas Fiscais** - Completo com Sugestão Inteligente
- Upload XML/PDF
- Parser NF-e com leitura correta de dVenc (cobr.dup.dVenc)
- **Sugestão Inteligente de Data:**
  - Data PASSADA → Apenas "Lançar AGORA" com data do vencimento
  - Data HOJE → "Lançar AGORA" com data de hoje
  - Data FUTURA → Oferece "Lançar FUTURO" com data de vencimento + opção "AGORA"
- Modal com seleção de data customizada
- Classificação automática (CMV/Operacional/Administrativa)

### 3. **Relatório CMV** - Novo
- Endpoint `/api/faturamentos/cmv/total` - Total consolidado
- Endpoint `/api/faturamentos/cmv/detalhado` - Por subcategoria
- Quebrado por Bebidas, Hortifruti, etc.

---

## 🔧 Stack Atual
- **Backend:** Node.js + Express (porta 5004) + SQLite
- **Frontend:** Vue 3 + Axios + Chart.js v3.9.1 + Tailwind CSS
- **Deployment:** Local (localhost:5004)

---

## 🐛 Bugs Corrigidos (Sessão Atual - 2026-04-14)

### 1. **Data Sugestão - Detecção de Datas Passadas**
- **Problema:** Parser lia dVenc do local errado (`<ide>` em vez de `<cobr><dup>`)
- **Solução:** Modificar `NotaFiscalParser.js` para ler de `cobr.dup.dVenc`
- **Status:** ✅ CORRIGIDO

### 2. **Sugestão Inteligente com Modal**
- **Problema:** Modal não diferenciava entre datas passadas/futuras
- **Solução:** Implementar `temSugestao` flag no backend, renderizar modal condicional no frontend
- **Status:** ✅ CORRIGIDO (com condicionais `v-if="sugestaoData.temSugestao"`)

### 3. **Performance por Categoria - Limpeza**
- **Problema:** Mostra todas as categorias (fornecedores, etc)
- **Solução:** Filtrar apenas Salão, iFood, 99Food, Keepa; atualizar 13 registros antigos
- **Status:** ✅ CORRIGIDO

### 4. **Porta 5002 Travada**
- **Problema:** Processo Node não conseguia ser morto, bloqueava nova inicialização
- **Solução:** Migrar para porto 5003 → 5004
- **Status:** ✅ CORRIGIDO

### 5. **Gráfico Tendência - Mostra Apenas Receitas**
- **Problema:** Gráfico mostra apenas valor consolidado, sem separação receita/despesa
- **Solução:** 
  - Backend: `Faturamento.obterDadosGrafico()` agora retorna receita E despesa por data com GROUP BY
  - Frontend: Adicionar 2 datasets (verde=receita, vermelho=despesa)
- **Status:** ✅ CORRIGIDO (porta 5004)

---

## 📁 Estrutura de Arquivos
```
C:\Users\bari.NTMAD243\salon-erp\
├── backend/
│   ├── app.js              (PORT 5004)
│   ├── database.js         (schema)
│   ├── routes/api.js       (30+ endpoints)
│   ├── models/
│   │   ├── Faturamento.js  (obterDadosGrafico com receita/despesa)
│   │   ├── NotaFiscal.js
│   │   └── TipoDespesa.js
│   ├── utils/
│   │   └── NotaFiscalParser.js  (lê de cobr.dup.dVenc)
│   └── salon-erp.db
├── frontend/
│   ├── index.html          (Vue 3 app)
│   ├── js/
│   │   └── utils/api.js    (BASE: localhost:5004)
│   └── css/style.css
└── README.md
```

---

## 🔌 Endpoints API Principais
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/faturamentos` | GET | Lista faturamentos últimos N dias |
| `/api/faturamentos/chart` | GET | Dados gráfico (receita+despesa por dia) |
| `/api/faturamentos/stats-categoria` | GET | Stats por categoria (4 principais) |
| `/api/faturamentos/cmv/total` | GET | Total CMV |
| `/api/faturamentos/cmv/detalhado` | GET | CMV por subcategoria |
| `/api/notas-fiscais` | GET | Lista notas (upload/processamento) |
| `/api/notas-fiscais/:id/sugestao-data` | GET | Sugestão inteligente (temSugestao true/false) |
| `/api/notas-fiscais/:id/processar` | POST | Processa nota e cria faturamento |
| `/api/tipo-despesa/*` | GET | Categorias despesa por classificação |

---

## 📊 Gráfico Tendência - Formato Novo
**Endpoint:** `GET /api/faturamentos/chart?from=2026-04-01&to=2026-04-30`

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "data": "2026-04-01",
      "receita": 3609.7,
      "despesa": 2183.59
    },
    {
      "data": "2026-04-02",
      "receita": 7215.18,
      "despesa": 1065.92
    }
  ]
}
```

**Renderização:** Chart.js com 2 datasets
- 🟢 Receitas (verde #10b981)
- 🔴 Despesas (vermelho #ef4444)

---

## 🎯 Melhorias Pendentes
- [ ] Relatórios PDF/Excel
- [ ] Automação envio Conta Azul
- [ ] Autenticação/permissões
- [ ] Deploy (Railway/Heroku)
- [ ] Mobile responsiveness avançado
- [ ] Dashboard de CMV em tempo real
- [ ] Integração com APIs externas (Conta Azul automático)

---

## 📝 Notas Importantes
- Sistema usa SQLite (arquivos: `salon-erp.db`)
- Vue 3 sem build (CDN)
- Chart.js v3.9.1 para gráficos
- Datas sempre em formato YYYY-MM-DD no backend
- Frontend em localhost:5004
- Conversas documentadas neste arquivo

---

**Próximo:** Aguardando user com novos bugs/features para implementar 🚀
