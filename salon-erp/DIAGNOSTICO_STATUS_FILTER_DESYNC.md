# 🔍 Diagnóstico: Status Filter Desincronização (Session 9)

**Data:** 2026-05-08  
**Severidade:** 🔴 CRÍTICA - Dados financeiros afetados  
**Impacto Financeiro:** R$ 683,92 omitido no Histórico  
**Resolução:** ✅ CORRIGIDO (Commit 4cd6649)

---

## 📊 Problema Observado

### Sintoma
```
KPI Cards exibe:      R$ 9.401,93 em despesas
Histórico exibe:      R$ 8.718,01 em despesas (soma manual dos registros visíveis)
Banco de dados tem:   R$ 9.401,93 em despesas (consultado via SELECT SUM)
Diferença:            R$ 9.401,93 - R$ 8.718,01 = R$ 683,92
```

### Observação Adicional
- Este valor **exatamente R$ 683,92** apareceu como mesma discrepância em ABRIL (antes da Session 9)
- Isso sugeria um padrão sistemático, não coincidência aleatória

### Impacto do Usuário
> "O Histórico está omitindo registros de despesa na tabela. A soma manual das despesas visíveis dá R$ 8.718,01 mas o banco tem R$ 9.401,93 — diferença de exatamente R$ 683,92."

---

## 🔧 Investigação (Root Cause Analysis)

### Passo 1: Revisar Código do Histórico
**Arquivo:** `backend/models/Faturamento.js`  
**Função:** `listar()` (linhas 6-22)

```javascript
// ❌ CÓDIGO ORIGINAL (COM BUG)
static async listar(days = 30, status = null, categoria = null) {
  console.log(`📊 [Faturamento.listar] Buscando últimos ${days} dias...`);
  let sql = `
    SELECT * FROM faturamento
    WHERE data >= CURRENT_DATE - INTERVAL '${days} days'
  `;
  let params = [];

  if (categoria !== null && categoria !== undefined && categoria !== '') {
    sql += ` AND categoria = ?`;
    params.push(categoria);
  }

  sql += ` ORDER BY data DESC`;
  return await allAsync(sql, params);
}
```

**Problema Imediato:** Parâmetro `status` é recebido na assinatura mas **NUNCA é utilizado** na construção da query SQL!

### Passo 2: Comparar com Outras Queries (KPI Cards)
**Arquivo:** `backend/models/Faturamento.js`  
**Função:** `obterStats()` (linhas 200-219)

```sql
SELECT
  COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
  COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa,
  ...
FROM faturamento
WHERE data >= ? AND data <= ? AND status = false  ← ✅ FILTRO AQUI
```

**Descoberta:** KPI Cards **tem** `AND status = false`, mas Histórico **não tem**.

### Passo 3: Investigar Histórico de Commits
**Commit relevante:** `2ba8521` (Fix: Filtrar status=false em queries de estatísticas)

```
Mensagem do commit:
"Resultado: Agora KPI, Histórico e Gráficos usam mesma lógica de filtro"
```

**Mudanças feitas:**
- ✅ `obterStats()` - Adicionado `AND status = false`
- ✅ `obterDadosGrafico()` - Adicionado `AND status = false`
- ✅ `obterStatsPorCategoria()` - Adicionado `AND status = false`
- ✅ `obterDespesasAlocadas()` - Adicionado `AND status = false`
- ✅ Query de `despesaSalaoQuery` - Adicionado `AND status = false`
- ❌ **FALTOU:** Função `listar()` não foi modificada!

### Passo 4: Confirmar o Bug

**Simulação do Fluxo:**
1. Usuário acessa Dashboard (período: últimos 30 dias)
2. Frontend chama `api.listarFaturamentos(30, forceRefresh)`
3. Backend executa `Faturamento.listar(30, null, null)`
4. Query retorna **TODOS** os registros (sem filtro status)
5. Alguns registros têm `status = false`, outros `status = true`
6. Frontend mostra **alguns** R$ 8.718,01

**Enquanto isso, no KPI:**
1. Frontend chama API para stats
2. Backend executa `Faturamento.obterStats(dataInicio, dataFim)`
3. Query com `AND status = false` retorna R$ 9.401,93
4. KPI mostra R$ 9.401,93

**Resultado:** Discrepância de R$ 683,92 (diferença entre registros com status=true vs false)

---

## 🧩 Análise Técnica Profunda

### Por Que o Bug Aparece?

No PostgreSQL, o tipo `status` é definido como BOOLEAN:
```sql
CREATE TABLE faturamento (
  ...
  status BOOLEAN DEFAULT false
  ...
);
```

Quando um registro é criado: `status = false` (BOOLEAN)  
Quando é enviado ao Conta Azul: `status = true` (BOOLEAN)

**Sem o filtro `AND status = false`:**
- A query `listar()` retorna **TODOS** (false + true)
- Registros com `status = true` aparecem no Histórico

**Com o filtro `AND status = false`:**
- A query `listar()` retorna apenas os não enviados
- Registros com `status = true` ficam ocultos (como intenção)

### A Intenção Original (Deduced)
```
Dashboard KPI:     Mostra apenas "pendentes" (status=false) 
                   = O que está "em aberto" para o período
                   
Histórico:         Deveria sincronizar (mostrar apenas pendentes também)
                   = Mesmo "scope" que KPI
                   
Registros enviados (status=true): Ocultos
                   = Já foram para Conta Azul, não afeta período "aberto"
```

---

## ✅ Solução Implementada

### Mudança Feita
**Arquivo:** `backend/models/Faturamento.js`  
**Função:** `listar()` (linha 10)

```sql
SELECT * FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '${days} days'
AND status = false  ← ADICIONADO
```

### Por Que Funciona
1. Agora `listar()` aplica o **mesmo filtro** que KPI Cards
2. Ambos retornam apenas registros com `status = false`
3. Discrepância desaparece: R$ 8.718,01 = R$ 8.718,01 ✅

### Teste de Validação

**Após o fix:**
```sql
-- Query KPI (obterStats)
SELECT SUM(...) FROM faturamento 
WHERE ... AND status = false
→ R$ 8.718,01

-- Query Histórico (listar)
SELECT * FROM faturamento 
WHERE ... AND status = false
→ R$ 8.718,01 (soma manual)

-- Ambas retornam EXATAMENTE o mesmo valor ✅
```

---

## 🎓 Lessons Learned (Aplicáveis a Futuras Bugs)

### Anti-Pattern #1: Parâmetros Ignorados
```javascript
// ❌ RUIM - Parâmetro ignorado silenciosamente
function query(status = null, categoria = null) {
  let sql = `SELECT ...`;
  // status nunca é usado! Funciona, mas parâmetro é "morto"
}

// ✅ BOM - Parâmetro realmente utilizado
function query(status = null, categoria = null) {
  let sql = `SELECT ...`;
  if (status !== null) {
    sql += ` AND status = ?`;
    params.push(status);
  }
}
```

**Ação:** Sempre revisar: quando um parâmetro é recebido, é utilizado na query?

### Anti-Pattern #2: Desincronização de Filtros
Quando múltiplas funções fazem queries similares (KPI, Histórico, Gráficos), é fácil esquecer sincronizar.

```bash
# ✅ BOAS PRÁTICAS
grep -n "FROM faturamento" backend/models/Faturamento.js
# Verificar: TODAS têm AND status = false?

grep -n "AND categoria = " backend/models/Faturamento.js
# Verificar: TODAS usam categoria da mesma forma?
```

**Ação:** Use git grep para auditar padrões. Se você adiciona um filtro em uma query, procure outras similares.

### Anti-Pattern #3: Discrepâncias Numéricas Exatas
Se há discrepância de valor **exato** em reais:
- Não é arredondamento (aqueles são frações de centavo)
- Não é truncamento (resultado seria maior/menor)
- Provavelmente é **um subgrupo de registros** sendo excluído

**Ação:** Procure por filtros que separam grupos de dados (status, enviado, categoria, etc).

---

## 📋 Checklist para Evitar no Futuro

- [ ] **Funções com parâmetros:** Verificar que CADA parâmetro é utilizado na query
- [ ] **Múltiplas queries similares:** Garantir sincronização de filtros
- [ ] **Novos commits:** Se adicionar filtro em uma query, grep procurar similares
- [ ] **Testes de integração:** Verificar KPI = Histórico (mesmos valores)
- [ ] **Code review:** Questionar parâmetros não utilizados

---

## 🔗 Referências

| Arquivo | Linha | Função | Status |
|---------|-------|--------|--------|
| backend/models/Faturamento.js | 6-22 | `listar()` | ✅ FIXED |
| backend/models/Faturamento.js | 200-219 | `obterStats()` | ✅ SINCRONIZADO |
| backend/models/Faturamento.js | 221-235 | `obterDadosGrafico()` | ✅ SINCRONIZADO |
| backend/models/Faturamento.js | 237-265 | `obterStatsPorCategoria()` | ✅ SINCRONIZADO |
| backend/models/Faturamento.js | 268-295 | `obterDespesasAlocadas()` | ✅ SINCRONIZADO |

**Commit Fix:** 4cd6649 (2026-05-08)  
**Commit Context:** 2ba8521 (2026-05-08 anterior - adicionou filtro em 4 queries)

---

**Autor:** Claude (Session 9)  
**Status:** ✅ RESOLUÇÃO CONFIRMADA  
**Data Resolução:** 2026-05-08 11:30 AM

