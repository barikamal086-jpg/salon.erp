# 📋 Próximas Ações: Diagnóstico KPI 01/05 e 02/05

**Relatório:** Receitas de 01/05 e 02/05 não aparecem no KPI, mas aparecem no Histórico  
**Data:** 2026-05-08  
**Status:** ⏳ Aguardando dados do banco

---

## 🎯 O Que Sabemos

✅ **Histórico mostra:** Registros de 01/05 e 02/05 existem no banco  
❌ **KPI não mostra:** R$ 0,00 ou valores incompletos para esses dias  
🔍 **Query KPI:** `WHERE data >= ? AND data <= ? AND status = false`  
🔍 **Query Histórico:** `WHERE data >= CURRENT_DATE - INTERVAL '30 days' AND status = false` (após Session 9 fix)

---

## 🧪 Ações de Diagnóstico (Execute em Ordem)

### AÇÃO 1: Executar Script SQL de Diagnóstico ⭐ CRÍTICA
**Arquivo:** `diagnostico-receitas-01-02-maio.sql`

**Como executar:**
1. Abra seu cliente PostgreSQL (pgAdmin, DBeaver, ou psql)
2. Copie e cole CADA QUERY abaixo, uma de cada vez
3. Anote os resultados para cada query

**Queries principais:**

```sql
-- Query 1: VER TODOS OS REGISTROS DE 01/05 E 02/05
SELECT * FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02'
ORDER BY data DESC;

-- Query 2: CONTAR RECEITAS (SEM FILTRO STATUS)
SELECT COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as num_receitas,
       SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02';

-- Query 3: DISTRIBUIÇÃO DE STATUS
SELECT status, COUNT(*) as num_registros,
       SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02'
GROUP BY status;

-- Query 4: KPI EXATA (COM status = false)
SELECT SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02' AND status = false;
```

### AÇÃO 2: Verificar Período Selecionado no Dashboard
**Como fazer:**
1. Abra o Dashboard em `caixa360.up.railway.app`
2. Veja qual é o período selecionado no topo (deve mostrar datas de início/fim)
3. Verifique se 01/05 e 02/05 estão dentro desse período
4. Abra o DevTools (F12) → Console e execute:
```javascript
console.log({
  periodo: app.periodo,
  dataInicio: app.periodo.dataInicio,
  dataFim: app.periodo.dataFim,
  incluiMaio1: app.periodo.dataInicio <= '2026-05-01' && app.periodo.dataFim >= '2026-05-01',
  incluiMaio2: app.periodo.dataInicio <= '2026-05-02' && app.periodo.dataFim >= '2026-05-02'
});
```

### AÇÃO 3: Forçar Refresh de Cache
**Como fazer:**
1. Abra o Dashboard
2. Aperte Ctrl+Shift+Delete (ou Cmd+Shift+Delete no Mac)
3. Limpe o cache do website
4. Recarregue a página (Ctrl+R ou Cmd+R)
5. Verifique se o KPI mostra as receitas agora

### AÇÃO 4: Verificar Logs do Browser
**Como fazer:**
1. Abra o Dashboard
2. Abra DevTools (F12) → Console
3. Procure por logs que começam com `📊 Carregando stats...`
4. Veja qual período está sendo enviado para a API:
```
📊 Carregando stats...
  Período: de 2026-04-08 até 2026-05-08
```

5. Verifique se 01/05 e 02/05 estão dentro do período mostrado

---

## 📊 Interpretação dos Resultados

### Cenário A: Query 2 mostra receitas, mas Query 4 mostra R$ 0,00
**Diagnóstico:** Receitas têm `status ≠ false`  
**Causa Raiz:** Registros foram marcados como "enviados" (status = true)  
**Solução:** Verificar se foram enviados acidentalmente ao Conta Azul

### Cenário B: Query 2 mostra receitas, Query 4 também mostra receitas
**Diagnóstico:** Query está ok, problema é no Frontend ou período  
**Causa Raiz:** 
- Dashboard está filtrando por período que NÃO inclui 01/05 e 02/05
- Ou há cache que precisa ser limpo  
**Solução:** Verifique AÇÃO 2 e AÇÃO 3

### Cenário C: Query 2 mostra R$ 0,00
**Diagnóstico:** Registros não existem no banco  
**Causa Raiz:** Registros nunca foram salvos, ou foram deletados  
**Solução:** Verificar histórico de commits ou se foram acidentalmente deletados

### Cenário D: Query 4 mostra mais do que Query 2
**Diagnóstico:** Há um bug na filtragem do banco ou tipos de dados  
**Causa Raiz:** Tipo de data problemático ou filtro duplo  
**Solução:** Analisar tipos de dados na tabela

---

## ⚡ Quick Fixes (Tente Primeiro)

### Fix #1: Limpar Cache
```bash
# No seu browser:
# 1. Ctrl+Shift+Delete
# 2. Selecione "Arquivos Agora em Cache"
# 3. Clique em "Limpar"
# 4. Recarregue a página
```

### Fix #2: Reselecionar Período
```
1. Abra Dashboard
2. Mude o período (ex: "Este Mês" → "Últimos 30 dias")
3. Verifique se receitas aparecem agora
```

### Fix #3: Forçar Refresh no Dashboard
```javascript
// Execute no DevTools Console:
await app.atualizarPeriodo();
```

---

## 🔗 Arquivos Relacionados

- `diagnostico-receitas-01-02-maio.sql` - Script SQL completo com 8 queries
- `backend/models/Faturamento.js` - Função `obterStats()` (linha 192)
- `backend/routes/api.js` - Endpoint `/faturamentos/stats` (linha 376)
- `backend/frontend/index.html` - Frontend logic (carregarStats, atualizarPeriodo)

---

## 📞 Se Nada Funcionar

Depois de executar as ações acima:
1. Envie os **resultados das 4 queries SQL** (AÇÃO 1)
2. Descreva qual **período está selecionado** (AÇÃO 2)
3. Mostre o que apareceu no **console (AÇÃO 4)**
4. Com essas informações, poderei diagnosticar o problema exato

---

## ✅ Checklist de Diagnóstico

- [ ] Executei as 4 queries SQL (AÇÃO 1)
- [ ] Verifiquei o período selecionado (AÇÃO 2)
- [ ] Limpei cache e recarreguei (AÇÃO 3)
- [ ] Verifiquei logs do console (AÇÃO 4)
- [ ] Tentei pelo menos um dos "Quick Fixes"
- [ ] Tenho os resultados prontos para compartilhar

