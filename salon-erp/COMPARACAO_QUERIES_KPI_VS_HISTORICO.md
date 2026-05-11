# 📊 Comparação Visual: Queries do KPI vs Histórico

---

## 🎯 TOTAL CORRETO CONFIRMADO

**No banco:** R$ 165.280,87 (95 registros de despesa em abril)

---

## 📝 QUERY 1: KPI CARDS (obterStats)

**Arquivo:** `backend/models/Faturamento.js` linha 191-219

```sql
SELECT
  COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
  COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa,  ← DESPESA
  ...
FROM faturamento
WHERE 
  data >= '2026-04-01' 
  AND data <= '2026-04-30'
  AND status = false  ← ❌ PROCURA BOOLEAN FALSE
```

**Parâmetros:** `(dataInicio='2026-04-01', dataFim='2026-04-30')`

**Resultado Esperado:** R$ 165.280,87
**Resultado Real:** ??? (MAS você reportou diferença de R$ 683,92)

**Problema:** `status = false` procura por BOOLEAN FALSE, mas banco tem STRING 'f'

---

## 📝 QUERY 2: HISTÓRICO (listar + JavaScript filter)

### Parte Backend
**Arquivo:** `backend/models/Faturamento.js` linha 6-22

```sql
SELECT * FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '365 days'
```

**Nota:** SEM filtro de status! Retorna TODOS.

### Parte Frontend
**Arquivo:** `backend/frontend/index.html` linha 2467-2472

```javascript
// Computed property: receitasFiltradas
return this.receitas.filter(r => {
  const dataOk = r.data >= '2026-04-01' && r.data <= '2026-04-30';
  const categoriaOk = !filtroHistorico.categoria || r.categoria === filtroHistorico.categoria;
  return dataOk && categoriaOk;
});

// Depois, reduz para despesas
const totalDespesa = receitasFiltradas
  .filter(r => r.tipo === 'despesa')
  .reduce((acc, r) => acc + parseFloat(r.total), 0);
```

**Nota:** NÃO filtra status! Inclui todos!

**Resultado Esperado:** R$ 165.280,87 ✅
**Resultado Real:** R$ 165.280,87 ✅ (você confirmou)

**Por que funciona:** JavaScript recebe TODOS os registros (sem filtro de status) e soma

---

## 🔴 DIFERENÇA CRÍTICA

| Aspecto | KPI Cards | Histórico |
|---------|-----------|-----------|
| **Filtro de Status** | `status = false` (BOOLEAN) | Nenhum (JavaScript soma todos) |
| **Tipo de Dados Esperado** | BOOLEAN FALSE | STRING 'f' |
| **Tipo de Dados Real** | STRING 'f' | STRING 'f' |
| **Match** | ❌ Não encontra | ✅ Encontra (não filtra) |
| **Resultado** | ??? (menos que correto) | R$ 165.280,87 ✅ |
| **Diferença** | ? | R$ 0,00 |

---

## 📊 SIMULAÇÃO: O Que Está Acontecendo

```
Banco tem 95 registros de despesa em abril:
├─ 92 com status = 'f'        → R$ 164.597,00
├─ 3 com status = 't'         → R$ 683,92
└─ Alguns com status = FALSE  → ???

Query KPI (status = false):
├─ Procura: BOOLEAN FALSE
├─ Encontra: ??? registros
└─ Soma: ??? (provavelmente sem os 'f' e 't')

Query Histórico (sem filtro):
├─ Retorna: Todos os 95 registros
├─ JavaScript filtra por data e categoria
├─ Soma: R$ 164.597,00 + R$ 683,92 = R$ 165.280,87
└─ Resultado: ✅ CORRETO
```

**A diferença de R$ 683,92 = Exatamente os registros com status = 't'!**

---

## ✅ VERIFICAÇÃO FINAL

Para confirmar a causa exata, execute estas 3 queries:

### Query A: Com status = false (o que KPI usa agora)
```sql
SELECT 
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
  AND tipo = 'despesa'
  AND status = false;
```

**Resultado esperado:** Pode ser 0 ou algum valor < R$ 165.280,87

---

### Query B: Com status = 'f' (STRING)
```sql
SELECT 
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
  AND tipo = 'despesa'
  AND status = 'f';
```

**Resultado esperado:** Pode ser R$ 164.597,00 (sem os 't')

---

### Query C: SEM filtro de status (o que Histórico faz)
```sql
SELECT 
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
  AND tipo = 'despesa';
```

**Resultado esperado:** R$ 165.280,87 ✅

---

## 🎯 CONCLUSÃO

A Query do KPI está:
```sql
WHERE status = false  ← Procurando BOOLEAN
```

Mas o banco tem:
```
status = 'f'  ← STRING
```

**Solução:** Mudar query para aceitar ambos:

```sql
WHERE (status = false OR status = 'f')
```

---

## 📝 Fix a Aplicar

**Arquivo:** `backend/models/Faturamento.js`

**Mudar linhas:**
- 209: `WHERE data >= ? AND data <= ? AND status = false`
- 229: `WHERE data >= ? AND data <= ? AND status = false`
- 263: `WHERE data >= ? AND data <= ? AND status = false`
- (+ 1 em obterDespesasAlocadas)

**Para:**
```sql
WHERE data >= ? AND data <= ? AND (status = false OR status = 'f')
```

---

**Status:** 🔍 Aguardando resultado das 3 queries para confirmar
