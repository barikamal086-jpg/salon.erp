# 🔍 Diagnóstico: Discrepância de R$ 683,92 em Abril

**Data:** 2026-05-08  
**Problema:** R$ 683,92 faltando em despesas de abril entre KPI e Histórico  
**Causa Identificada:** Tipo de dados incompatível em `status`

---

## 📋 Fatos Confirmados

✅ Total correto no banco: **R$ 165.280,87** (95 registros)
✅ Todos os registros têm: `status = 'f'` (STRING)
✅ Sem dupla contagem
✅ Sem registros em taxas_plataforma

---

## 🔴 O PROBLEMA: Tipo de Dados

### Schema da Tabela
```sql
CREATE TABLE faturamento (
  ...
  status BOOLEAN DEFAULT false  ← Esperado: BOOLEAN
  ...
)
```

### Dados Reais no Banco
```
status = 'f'  ← Encontrado: STRING
```

### Comparação

| Query | Tipo Esperado | Tipo Real | Resultado |
|-------|---------------|-----------|-----------|
| `status = false` | BOOLEAN | STRING 'f' | ❌ NÃO ENCONTRA |
| `status = 'f'` | STRING | STRING 'f' | ✅ ENCONTRA |

---

## 📊 QUERIES ATUAIS vs CORRETAS

### KPI CARDS - QUERY ATUAL (obterStats)

**Arquivo:** `backend/models/Faturamento.js` linha 209

```sql
SELECT
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa,
  ...
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30' 
AND status = false  ← ❌ PROCURANDO BOOLEAN FALSE
```

**Resultado:** Encontra registros onde status é boolean FALSE
**Problema:** Banco tem STRING 'f'
**Despesas Encontradas:** ??? (menos de R$ 165.280,87)

---

### HISTÓRICO - QUERY ATUAL (listar)

**Arquivo:** `backend/models/Faturamento.js` linha 6

```sql
SELECT * FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '365 days'
```

**Depois, no Frontend (JavaScript):**
```javascript
receitas.filter(r => 
  r.data >= '2026-04-01' && 
  r.data <= '2026-04-30'
)
.filter(r => r.tipo === 'despesa')
.reduce((acc, r) => acc + parseFloat(r.total), 0)
```

**Resultado:** Encontra todos os 95 registros (não filtra status!)
**Despesas Encontradas:** R$ 165.280,87 ✅

---

## 🎯 POR QUE A DISCREPÂNCIA?

### Cenário

```
Banco tem:
  - 95 registros de despesa em abril
  - Status = 'f' (STRING)
  - Total: R$ 165.280,87

KPI Query:
  SELECT SUM(...) WHERE status = false  ← Procurando boolean FALSE
  Resultado: Encontra X registros
  Total: R$ 165.280,87 - R$ 683,92 = R$ 164.597,00 (aprox)

Histórico Query:
  SELECT * (sem filtro de status)
  Resultado: Encontra todos 95 registros
  Total: R$ 165.280,87 ✅

Diferença: R$ 683,92
```

---

## ✅ SOLUÇÃO

### Opção 1: Corrigir a Query (RECOMENDADO)

**Mudar de:**
```sql
WHERE data >= ? AND data <= ? AND status = false
```

**Para:**
```sql
WHERE data >= ? AND data <= ? AND (status = false OR status = 'f')
```

**OU:**
```sql
WHERE data >= ? AND data <= ? AND status IN (false, 'f')
```

### Opção 2: Corrigir os Dados (Mais Caro)

```sql
-- Converter todos 'f' para FALSE e 't' para TRUE
UPDATE faturamento SET status = (status = 't');
```

---

## 📝 Qual Fix Aplicar?

**Recomendação:** Opção 1 (Corrigir Query)

Porquê:
- ✅ Não altera banco de dados
- ✅ Funciona imediatamente
- ✅ Retroativo (funciona com dados antigos)
- ✅ Reversível se necessário

---

## 🧪 Como Testar Qual é o Valor Real

Execute no banco:

```sql
-- Query 1: Com status = false (BOOLEAN)
SELECT 
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
AND tipo = 'despesa'
AND status = false;

-- Query 2: Com status = 'f' (STRING)
SELECT 
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
AND tipo = 'despesa'
AND status = 'f';

-- Query 3: SEM filtro de status
SELECT 
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
AND tipo = 'despesa';
```

**Resultado esperado:**
- Query 1: Alguns valores
- Query 2: R$ 165.280,87 (95 registros)
- Query 3: R$ 165.280,87 (95 registros)

---

## 📌 Por que isso aconteceu?

Provável cenário:
1. Tabela foi criada com `status BOOLEAN`
2. Dados foram inseridos como STRING 'f' e 't' (possivelmente de import Conta Azul)
3. PostgreSQL aceitou a inserção (coerção de tipo)
4. Queries esperavam BOOLEAN, mas dados são STRING
5. Resultado: Discrepância

---

## ✅ PRÓXIMOS PASSOS

1. Confirmar os valores com as 3 queries acima
2. Identificar qual valor falta: R$ 683,92
3. Aplicar fix na query
4. Testar se resolve

**Status:** 🔍 Aguardando confirmação dos valores das queries
