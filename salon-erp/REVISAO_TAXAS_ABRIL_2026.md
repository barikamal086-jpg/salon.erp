# 🔍 REVISÃO DE TAXAS - ABRIL 2026

**Data:** 2026-05-06  
**Período:** 01/04/2026 a 30/04/2026

---

## 📊 RESUMO COMPARATIVO DAS PLATAFORMAS

| Plataforma | Receita | Despesa | % Despesa | Status | Problema |
|-----------|---------|---------|-----------|--------|----------|
| **iFood** | R$ 89.270,34 | R$ 31.902,77 | **35,77%** ⚠️⚠️⚠️ | Aparece como "Despesa" | 🔴 **CRÍTICO** |
| **Keeta** | R$ 69.812,56 | R$ 3.631,52 | 5,20% | Aparece como "Taxa" | ✅ OK |
| **99Food** | R$ 48.022,14 | R$ 14.061,36 | 29,28% | Aparece como "Taxa" | ⚠️ Alto |
| **Salão** | ? | ? | ? | - | ? |

---

## 🚨 PROBLEMA PRINCIPAL: iFood

### Dados do Histórico (Screenshot do Usuário):
```
qui., 30/04/2026 | Receita | iFood | R$ 89.270,34
qui., 30/04/2026 | Despesa | iFood | R$ 31.902,77
```

### Análise:
- ✅ Receita está correta: R$ 89.270,34
- ❌ **Despesa de R$ 31.902,77 foi classificada como "Despesa" genérica**
- ❌ **Deveria estar classificada como "Taxas" como as demais plataformas**
- ⚠️ A proporção (35,77%) é MAIOR que 99Food (29,28%)

### Questão:
**Qual é o `tipo_despesa_id` da despesa de iFood (R$ 31.902,77)?**
- Se é **ID 13** → Está correto como "Taxas"
- Se é **outro ID** → Foi classificada errada e precisa ser corrigida

---

## 📈 COMPARAÇÃO DE TAXAS

### Por Percentual da Receita:
1. **iFood:** 35,77% ❌ (aparece como "Despesa", não "Taxa")
2. **99Food:** 29,28% ⚠️ (aparece como "Taxa")
3. **Keeta:** 5,20% ✅ (aparece como "Taxa")

### Por Valor Absoluto:
1. **iFood:** R$ 31.902,77 ❌ (como "Despesa")
2. **99Food:** R$ 14.061,36 (como "Taxa")
3. **Keeta:** R$ 3.631,52 (como "Taxa")

---

## ✅ AÇÕES NECESSÁRIAS

### 1. Verificar tipo_despesa_id da despesa iFood
```sql
SELECT
  f.id,
  f.data,
  f.tipo_despesa_id,
  td.subcategoria,
  td.classificacao,
  f.total
FROM faturamento f
LEFT JOIN tipo_despesa td ON f.tipo_despesa_id = td.id
WHERE f.categoria = 'iFood'
  AND f.tipo = 'despesa'
  AND f.data = '2026-04-30'
  AND f.total = 31902.77;
```

**Resultado esperado:**
- Se `subcategoria = 'Taxas'` → ✅ Está correto
- Se `subcategoria ≠ 'Taxas'` → ❌ Precisa corrigir para tipo_despesa_id = 13

### 2. Se precisar Corrigir
```sql
UPDATE faturamento 
SET tipo_despesa_id = 13
WHERE categoria = 'iFood'
  AND tipo = 'despesa'
  AND total = 31902.77
  AND data = '2026-04-30';
```

---

## 🎯 CONCLUSÃO

**O erro está em iFood:**
- Receita: R$ 89.270,34 ✅
- Despesa: R$ 31.902,77 ❌ (classificada como "Despesa" em vez de "Taxas")

**Solução:** Verificar e corrigir o `tipo_despesa_id` para 13 (Taxas) se ainda não for.

---

## 📝 NOTAS

- Keeta está OK (5,20% é taxa padrão)
- 99Food pode estar certa (29,28% é alto mas possível)
- **iFood é o problema crítico** (35,77% e não está aparecendo como "Taxa")
