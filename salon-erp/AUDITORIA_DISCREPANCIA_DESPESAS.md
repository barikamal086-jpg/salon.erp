# 🔍 AUDITORIA: Discrepância de Totais - KPI vs Histórico

**Data:** 2026-05-08  
**Criticidade:** ALTA  
**Problema:** Soma de DESPESAS diferente entre KPI Cards e Histórico quando muda data range

---

## 📊 O Que o Usuário Observou

**Cenário:**
- Muda a data no filtro de "Indicadores de Performance" (KPI Cards)
- A data muda CORRETAMENTE no Histórico também ✅
- **MAS:** Os totais de DESPESAS diferem entre os dois ❌

**Observação Crucial:**
- Soma de **RECEITA**: Fica IGUAL quando adiciona 1 dia ✅
- Soma de **DESPESA**: Continua DIFERENTE mesmo com +1 dia ❌

Isso sugere que:
1. A lógica de filtro é consistente para RECEITAS
2. Há algo especial acontecendo com DESPESAS

---

## 🏗️ ARQUITETURA DE DADOS

### Fluxo 1: KPI Cards (Indicadores de Performance)
```
Frontend: Usuário muda data
    ↓
Frontend chama: api.obterStats(dataInicio, dataFim)
    ↓
Backend endpoint: GET /api/faturamentos/stats?from=X&to=Y
    ↓
Modelo: Faturamento.obterStats(dataInicio, dataFim)
    ↓
SQL Query:
    SELECT
      SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita,
      SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa,
      ...
    FROM faturamento
    WHERE data >= ? AND data <= ?
```

**Características:**
- Cálculo no BACKEND (SQL SUM)
- Usa data range EXPLÍCITO (from/to)
- NÃO filtra por status
- NÃO filtra por categoria (a menos que especificado)

---

### Fluxo 2: Histórico Table (Tabela de Registros)
```
Frontend: Inicializa
    ↓
Carrega: api.listarFaturamentos(365) - SEMPRE 365 dias!
    ↓
Backend endpoint: GET /api/faturamentos?days=365
    ↓
Modelo: Faturamento.listar(365, null, restaurante)
    ↓
SQL Query:
    SELECT * FROM faturamento
    WHERE data >= CURRENT_DATE - INTERVAL '365 days'
```

**Depois, FRONTEND faz:**
```
Filtra JavaScript:
    receitas.filter(r => 
      r.data >= filtroHistorico.dataInicio AND
      r.data <= filtroHistorico.dataFim AND
      (!filtroHistorico.categoria || r.categoria === filtroHistorico.categoria)
    )
    
Calcula totais (JavaScript):
    totalDespesa = receitas
      .filter(r => r.tipo === 'despesa')
      .reduce((acc, r) => acc + parseFloat(r.total), 0)
```

**Características:**
- Cálculo no FRONTEND (JavaScript reduce)
- Sempre carrega 365 dias, depois filtra
- Usa string comparison para datas (lexicográfica)
- Filtra por categoria se especificado

---

## 🔴 POSSÍVEIS CAUSAS DA DISCREPÂNCIA

### 1️⃣ Diferença em Inclusão/Exclusão de Datas

**Backend (obterStats):**
```sql
WHERE data >= ? AND data <= ?  -- Ambas inclusivas
```

**Frontend (Histórico):**
```javascript
r.data >= dataInicio && r.data <= dataFim  -- Ambas inclusivas (string comparison)
```

❌ **TEORICAMENTE IDÊNTICO** mas...

⚠️ **RISCO:** Se dataFim for "2026-05-07" e houver um registro com data "2026-05-07T23:59:59" (com hora), isso pode gerar discrepância. Mas o banco guarda como DATE (sem hora), então improvável.

---

### 2️⃣ Filtro de Status Oculto

**Possibilidade:** Despesas com `status = true` (enviadas) podem estar sendo filtradas diferentemente.

**Check:**
- ❓ Backend filtra por `status` em algum lugar?
- ❓ Frontend descarta registros com status TRUE?

**Busca no código:**
```bash
grep -n "status = 1\|status = true\|status = false" backend/routes/api.js
grep -n "WHERE status\|AND status" backend/models/Faturamento.js
grep -n "r.status\|.status ==\|.status ===" backend/frontend/index.html
```

---

### 3️⃣ Despesas Alocadas/Distribuídas

**Problema Encontrado em Session 5:**
- Despesas Salão não recebem alocação
- Despesas iFood/Keeta/99Food recebem proporcionalmente
- Há uma lógica de `obterDespesasAlocadas` que modifica totais

**Possibilidade:** A tela de Histórico mostra despesas ANTES da alocação, mas o KPI mostra APÓS alocação?

**Check:**
- ❓ Histórico usa `resumoFiltrado.totalDespesa` (cálculo simples)
- ❓ KPI usa `stats.totalDespesa` (pode incluir alocações?)

---

### 4️⃣ Diferença em Tempo Real vs Carregamento

**Timeline:**
1. Usuário muda data no KPI
2. Frontend chama `carregarStats()` → API obterStats
3. Frontend chama `carregarReceitas()` → API listarFaturamentos (365 dias SEMPRE)
4. Frontend filtra receitas client-side

**Problema:** Se um registro for inserido ENTRE o carregamento de stats e o de receitas, pode haver discrepância!

**Exemplo:**
- 13:00:00 - Usuário muda para "Este mês"
- 13:00:01 - obterStats executa: encontra 100 despesas
- 13:00:02 - Novo despesa é inserida no banco ⚠️
- 13:00:03 - listarFaturamentos executa: encontra 101 despesas
- Resultado: Discrepância de 1 despesa!

---

### 5️⃣ Diferença em Precisão Decimal

**Frontend JavaScript:**
```javascript
const valor = parseFloat(r.total);  // String → Float
return acc + valor;  // Soma floating point
```

**Backend SQL:**
```sql
SUM(total)  -- Soma DECIMAL(10,2)
```

**Problema:** Floating point pode perder precisão com muitos decimais!

**Exemplo:**
- Frontend: 100.10 + 50.20 + 30.45 = 180.75000000000003 ❌
- Backend: DECIMAL SUM = 180.75 ✅

---

## 🛠️ SCRIPT DE DIAGNÓSTICO

Para identificar a causa exata, precisamos executar:

### 1. Verificar Totais Direto no Banco

```sql
-- Verificar total de DESPESAS para um período específico
SELECT 
  COUNT(*) as total_registros,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita_sql,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa_sql,
  COUNT(DISTINCT CASE WHEN tipo = 'despesa' THEN id END) as num_despesas
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-08';
```

### 2. Verificar o que o Backend Retorna

```javascript
// Test: Chamar endpoint obterStats
GET http://localhost:5006/api/faturamentos/stats?from=2026-05-01&to=2026-05-08

// Response esperado:
{
  "success": true,
  "data": {
    "totalReceita": XXXX,
    "totalDespesa": YYYY,
    ...
  }
}
```

### 3. Verificar o que o Frontend Carrega

```javascript
// No console do navegador:
window.api.listarFaturamentos(365).then(res => {
  const receitas = res.data.data;
  
  // Filtrar para o período
  const filtradas = receitas.filter(r =>
    r.data >= '2026-05-01' && r.data <= '2026-05-08'
  );
  
  // Calcular totais (como faz o frontend)
  const totalDespesa_frontend = filtradas
    .filter(r => r.tipo === 'despesa')
    .reduce((acc, r) => acc + parseFloat(r.total), 0);
    
  console.log({
    receitas_carregadas: receitas.length,
    receitas_filtradas: filtradas.length,
    totalDespesa_frontend: totalDespesa_frontend.toFixed(2)
  });
});
```

---

## 🔍 INVESTIGAÇÃO POR TIPO DE DESPESA

**Hipótese:** Despesas de um tipo específico (ex: Taxas, CMV) podem estar sendo tratadas diferentemente.

Comparar por tipo_despesa:

```sql
SELECT 
  td.subcategoria,
  COUNT(f.id) as num_registros,
  SUM(f.total) as total_despesa,
  AVG(f.total) as media,
  MAX(f.total) as maximo,
  MIN(f.total) as minimo
FROM faturamento f
LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
WHERE f.tipo = 'despesa' AND f.data >= '2026-05-01' AND f.data <= '2026-05-08'
GROUP BY td.subcategoria
ORDER BY total_despesa DESC;
```

---

## 📋 CHECKLIST DE INVESTIGAÇÃO

- [ ] **Verificar filtro de status**
  - Há registros com `status = true`?
  - Afetam apenas despesas ou também receitas?

- [ ] **Verificar alocações**
  - `obterDespesasAlocadas` está sendo aplicado ao KPI?
  - Frontend usa dados brutos ou alocados?

- [ ] **Verificar datas**
  - Há timezone issues (data com hora vs date)?
  - Inclusão/exclusão das datas é idêntica?

- [ ] **Verificar tipo_despesa**
  - Algum tipo de despesa tem lógica especial?
  - CMV, Taxas, etc têm tratamento diferente?

- [ ] **Verificar timing**
  - Há registros inseridos entre os dois carregamentos?
  - Ordem de execução dos métodos?

- [ ] **Verificar precision**
  - Floating point losses no frontend?
  - Rounding diferente?

---

## 🎯 PRÓXIMOS PASSOS

1. **Coletar dados:** Pedirdevtools console output mostrando exatamente quais valores diferem
2. **Comparar queries:** Executar mesmos filtros no SQL e comparar com frontend
3. **Simular cenário:** Reproduzir exatamente os mesmos dados em teste isolado
4. **Isolar variável:** Desabilitar alocações e verificar se discrepância some
5. **Fixar causa:** Uma vez identificada, implementar fix

---

## 📌 INFORMAÇÕES A COLETAR DO USUÁRIO

Quando o usuário relatar discrepância novamente:

1. **Screenshot:** KPI totals + Histórico totals + date range visível
2. **Console logs:** Abrir DevTools → Console → Colar:
   ```javascript
   console.log({
     stats: window.app.$data.stats,
     filtro: window.app.$data.filtroHistorico,
     resumoFiltrado: window.app.$data.resumoFiltrado,
     receitas_carregadas: window.app.$data.receitas.length
   });
   ```
3. **Data range exato:** "De X até Y" (inclusive)
4. **Diferença exata:** Quanto diferencia em valor

---

**Status:** ⏳ Aguardando diagnóstico detalhado
