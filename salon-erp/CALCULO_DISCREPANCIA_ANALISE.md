# 🔍 Análise: Discrepância de Cálculos Dashboard vs Histórico

**Data:** 2026-05-07  
**Status:** ❌ IDENTIFICADO O PROBLEMA  
**Prioridade:** CRÍTICA

---

## 📊 O Problema

Dashboard e Histórico **sincronizaram DATAS** com sucesso, mas **VALORES DIFEREM**:
- Dashboard: Receita R$ 1.739,85 + Despesa R$ 8.718,01
- Histórico: Receita R$ 0,00 + Despesa -R$ 7.549,65

Ambos usando **MESMO período** (2026-04-06 a 2026-05-06).

---

## 🔧 Raiz da Discrepância

### DASHBOARD - Cálculo no Backend
**Arquivo:** `backend/routes/api.js` (método `/api/faturamentos/stats`)
```javascript
// Dashboard obtém stats do ENDPOINT da API
// Usa query SQL no backend para calcular:
// - totalReceita (SUM onde tipo='receita')
// - totalDespesa (SUM onde tipo='despesa')
// - Período: WHERE data BETWEEN ? AND ?
```

**Lógica (Backend):**
```sql
SELECT 
  SUM(CASE WHEN tipo='receita' THEN total ELSE 0 END) as receita,
  SUM(CASE WHEN tipo='despesa' THEN total ELSE 0 END) as despesa
FROM faturamento
WHERE data BETWEEN dataInicio AND dataFim
```

---

### HISTÓRICO - Cálculo no Frontend
**Arquivo:** `backend/frontend/index.html` (propriedade computada `resumoFiltrado`)
```javascript
// Histórico calcula localmente no Vue (computed property)
resumoFiltrado() {
  const totalReceita = this.receitasFiltradas
    .filter(r => r.tipo === 'receita')
    .reduce((acc, r) => acc + parseFloat(r.total), 0);

  const totalDespesa = this.receitasFiltradas
    .filter(r => r.tipo === 'despesa')
    .reduce((acc, r) => acc + parseFloat(r.total), 0);

  return {
    totalReceita,
    totalDespesa,
    totalLiquido: totalReceita - totalDespesa
  };
}
```

**Lógica (Frontend):**
```javascript
// 1. Filtra this.receitas com TWO critérios:
receitasFiltradas = this.receitas.filter(r => {
  const dataOk = r.data >= filtroHistorico.dataInicio AND r.data <= filtroHistorico.dataFim;
  const categoriaOk = !filtroHistorico.categoria OR r.categoria === filtroHistorico.categoria;
  return dataOk && categoriaOk;
});

// 2. Soma os filtrados
totalReceita = SUM(tipo='receita')
totalDespesa = SUM(tipo='despesa')
```

---

## 🎯 Possíveis Causas de Discrepância

### 1. **Array `receitas` Não Carregou Todos os Dados**
```javascript
// Backend: Há registros no banco?
// Frontend: carregarReceitas() busca ÚLTIMOS 365 DIAS
async carregarReceitas(forceRefresh = false) {
  const response = await api.listarFaturamentos(365, forceRefresh);
  // Recebe todos os faturamentos dos últimos 365 dias
  // Depois FILTRA pelo período do Dashboard/Histórico
}
```

**Possível cenário:**
- Banco tem 100 registros no período 2026-04-06 a 2026-05-06
- `carregarReceitas(365)` traz 80 registros (fora do período dos últimos 365 dias?)
- Dashboard busca stats direto do banco = 100 (correto)
- Histórico soma os 80 carregados = valores diferentes

### 2. **Conversão de Tipos Diferente**

**Frontend:**
```javascript
parseFloat(r.total) || 0  // Pode falhar se total for NULL/undefined
```

**Backend:**
```javascript
-- Banco trata NULL como 0 automaticamente?
SUM(total)  -- NULLs são ignorados pelo SUM()
```

### 3. **Filtro de Data com Timezone**

**Frontend:**
```javascript
r.data >= "2026-04-06" AND r.data <= "2026-05-06"
// Se r.data vem com timestamp ISO (2026-04-06T00:00:00Z)
// Comparação string funciona? 
```

**Backend:**
```sql
WHERE data BETWEEN '2026-04-06' AND '2026-05-06'
-- SQL trata diferente de comparação string?
```

### 4. **Dados Carregados ≠ Dados no Banco**

**O maior suspeito:**
- `receitas` array pode ter ficado com dados STALE
- Após ADD/UPDATE/DELETE, pode haver desincronização
- Histórico mostra o que tem no memory (`this.receitas`)
- Dashboard mostra o que tem no banco (via API)

---

## 🔎 Como Verificar (Passo a Passo)

### Teste 1: Comparar Dados Brutos do Banco
```bash
curl "http://localhost:5006/api/faturamentos?days=365" | jq '.data | length'
# Contar quantos registros vêm da API

# No período 2026-04-06 a 2026-05-06, quantos destes?
curl "http://localhost:5006/api/faturamentos?days=365" | jq '.data | map(select(.data >= "2026-04-06" and .data <= "2026-05-06")) | length'
```

### Teste 2: Verificar Stats Direto
```bash
curl "http://localhost:5006/api/faturamentos/stats?from=2026-04-06&to=2026-05-06"
# Response deve ter totalReceita, totalDespesa
```

### Teste 3: Comparar Array vs API no Console Browser
```javascript
// Abrir DevTools Console (F12)

// Ver quantos registros estão em memory
console.log('Receitas em memory:', this.receitas.length);

// Ver quantos do período
console.log('Período:', this.filtroHistorico.dataInicio, 'a', this.filtroHistorico.dataFim);
console.log('Filtradas:', this.receitasFiltradas.length);

// Somar manualmente
const r = this.receitasFiltradas.filter(x => x.tipo === 'receita').reduce((a,x) => a + parseFloat(x.total), 0);
const d = this.receitasFiltradas.filter(x => x.tipo === 'despesa').reduce((a,x) => a + parseFloat(x.total), 0);
console.log('Receita (manual):', r);
console.log('Despesa (manual):', d);

// Comparar com props exibidos
console.log('Dashboard totalReceita:', this.stats.totalReceita);
console.log('Histórico totalReceita:', this.resumoFiltrado.totalReceita);
```

### Teste 4: Verificar Sincronização de Período
```javascript
// Console
console.log('Dashboard período:', this.periodo);
console.log('Histórico período:', this.filtroHistorico);
// Devem ser IGUAIS (datas) agora
```

---

## 🛠️ Solução Recomendada

### Opção A: Backend Confiável (PREFERIDA)
**Usar Dashboard stats do backend para AMBOS (Dashboard + Histórico)**

```javascript
// Histórico mostra stats do MESMO endpoint que Dashboard
// Em vez de computar localmente (resumoFiltrado),
// chamar: api.obterStats(filtroHistorico.dataInicio, filtroHistorico.dataFim)

// Vantagem: Backend é single source of truth
// Desvantagem: +1 API call, mas melhor que discrepância
```

### Opção B: Sincronizar Dados
**Garantir que `this.receitas` sempre tem todos os dados relevantes**

```javascript
// Em carregarReceitas():
// em vez de: api.listarFaturamentos(365)
// usar: api.listarFaturamentos(3650)  // últimos 10 anos
//   OU: sem limite (retorna TODOS)

// Assim this.receitas tem TUDO e frontend pode computar correto
```

### Opção C: Verificar Lógica de Filtro
**Comparar filtro do backend com filtro do frontend**

```javascript
// Frontend:
//   r.data >= "2026-04-06" AND r.data <= "2026-05-06"
//   (!categoria OR r.categoria === categoria)

// Backend (é idêntico?)
//   WHERE data BETWEEN ? AND ?
//   AND (categoria = ? OR categoria IS NULL?)
```

---

## 📋 Checklist Diagnóstico

- [ ] Abrir DevTools Console
- [ ] Rodar Teste 3 (verificar arrays)
- [ ] Comparar números com screenshot anterior
- [ ] Verificar se `/api/faturamentos/stats` retorna correto
- [ ] Verificar se `this.receitas` tem todos os registros
- [ ] Checar formato de data (YYYY-MM-DD vs outros)

---

## 🎯 Próximos Passos

1. **HOJE:** Rodar testes de diagnóstico acima
2. **Levantar causa raiz** baseado nos resultados
3. **Implementar solução** (A, B, ou C)
4. **Validar** que ambos agora mostram MESMOS valores
5. **Commit** com mensagem descritiva

---

## 📝 Contexto Anterior

- ✅ Parser números brasileiros: FUNCIONANDO
- ✅ UPDATE não faz refresh: CORRIGIDO  
- ✅ Sincronização de datas: FUNCIONANDO
- ❌ Sincronização de VALORES: PROBLEMA ATUAL

**Próximo:** Implementar diagnóstico e corrigir.
