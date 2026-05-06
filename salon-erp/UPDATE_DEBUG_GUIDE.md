# 🔍 Guia de Debug: UPDATE não Atualiza o Banco

## Problema

Ao editar um lançamento (receita/despesa):
- ✅ API retorna sucesso
- ✅ Logs mostram UPDATE executado
- ❌ Banco NÃO atualiza o valor

## Diagnóstico em 3 Camadas

### CAMADA 1: Frontend
**Objetivo:** Verificar se o valor está sendo normalizado corretamente

**Como testar:**
1. Abrir DevTools (F12) → Console
2. Digitar valor no modal: `36.315,20`
3. Rodar no console:
```javascript
parseBrasilValue("36.315,20")  // Deve retornar: 36315.2
```

**Resultado esperado:** `36315.2` (não `36.315,20`)

Se NÃO está funcionando:
- ❌ Arquivo não foi carregado: verificar se `numberParser.js` existe e está referenciado no HTML
- ❌ Erro no console: confirmar que a função está disponível globalmente

---

### CAMADA 2: API Backend
**Objetivo:** Verificar se o servidor está recebendo e enviando os dados corretos

**Como testar:**
1. Abrir terminal do servidor
2. Fazer uma edição qualquer no Dashboard
3. Procurar nos logs por: `🔍 [runAsync DEBUG]`

**Que dados você vai ver:**

```
🔍 [runAsync DEBUG] SQL CONVERTIDO: 
UPDATE faturamento 
SET data = $1, total = $2, categoria = $3, tipo = $4, tipo_despesa_id = $5, updated_at = NOW() 
WHERE id = $6

🔍 [runAsync DEBUG] PARAMS: ['2026-05-06', 36315.2, 'Keeta', 'despesa', 13, 123]
```

**Verificar:**
- ✅ O valor total está correto? (deve ser 36315.2, não "36.315,20")
- ✅ Os parâmetros estão na ordem certa? (data, total, categoria, tipo, tipo_despesa_id, id)
- ✅ O ID está no final? (sempre no WHERE id = ?)

Se algum estiver errado:
- Problema está no `convertPlaceholders()` (conversão de ? para $1, $2...)
- Problema está na ordem dos parâmetros enviados para `runAsync()`

---

### CAMADA 3: Banco de Dados
**Objetivo:** Verificar se o PostgreSQL está realmente atualizando

**Opção A: Testar Query Direto no Banco**

1. Conectar ao banco de dados Railway:
```bash
psql postgresql://USER:PASS@postgres.railway.internal:5432/railway
```

2. Ver registro ANTES:
```sql
SELECT id, data, total, categoria, tipo, tipo_despesa_id, updated_at 
FROM faturamento 
WHERE id = 123;
```

3. Executar UPDATE manual:
```sql
UPDATE faturamento 
SET data = '2026-05-06', total = 36315.2, categoria = 'Keeta', tipo = 'despesa', tipo_despesa_id = 13, updated_at = NOW() 
WHERE id = 123;
```

4. Ver registro DEPOIS:
```sql
SELECT id, data, total, categoria, tipo, tipo_despesa_id, updated_at 
FROM faturamento 
WHERE id = 123;
```

**Verificar:**
- ✅ A query retorna "UPDATE 1" (significa 1 linha foi atualizada)?
- ✅ O valor mudou quando você seleciona novamente?

Se UPDATE retorna "UPDATE 0":
- ❌ Não há registro com ID 123
- ❌ O WHERE clause não corresponde a nenhuma linha

Se valor não mudou:
- ❌ Possível trigger do banco ou constraint
- ❌ Possível issue de transaction/commit

**Opção B: Verificar via Backend**

1. Adicionar log antes/depois na função `runAsync`:

Arquivo: `backend/database.js`

```javascript
async function runAsync(sql, params = []) {
  try {
    // ... código existente ...
    
    // NOVO: Log antes de executar
    if (sql.toUpperCase().includes('UPDATE faturamento')) {
      const selectBefore = `SELECT id, total, updated_at FROM faturamento WHERE id = ${params[params.length - 1]}`;
      const resultBefore = await pool.query(selectBefore);
      console.log('🔵 ANTES UPDATE:', resultBefore.rows[0]);
    }
    
    const result = await pool.query(convertedSql, params);
    
    // NOVO: Log depois de executar
    if (sql.toUpperCase().includes('UPDATE faturamento')) {
      const idParam = params[params.length - 1];
      const selectAfter = `SELECT id, total, updated_at FROM faturamento WHERE id = ${idParam}`;
      const resultAfter = await pool.query(selectAfter);
      console.log('🟢 DEPOIS UPDATE:', resultAfter.rows[0]);
      console.log(`🔄 Total mudou? ${resultBefore.rows[0].total} → ${resultAfter.rows[0].total}`);
    }
```

Isso mostrará exatamente o que o banco está vendo antes e depois.

---

## Checklist de Debug

### ✅ Antes de reportar o problema:

- [ ] Copiar a FUNÇÃO INTEIRA `salvarEdicao()` do console
- [ ] Copiar os LOGS DO BACKEND (stderr/stdout) da edição
- [ ] Confirmar qual é o ID do registro que estava tentando editar
- [ ] Confirmar qual era o valor ANTES e qual queria colocar DEPOIS
- [ ] Rodar a query UPDATE manualmente no banco (Railway) e confirmar se funciona

### ✅ Logs Críticos a Compartilhar:

1. **Frontend Console (F12):**
```javascript
console.log('Normalizando:', this.receitaEmEdicao.total);
console.log('Resultado:', parseBrasilValue(this.receitaEmEdicao.total));
```

2. **Backend Logs:**
Procurar por linhas com:
- `🔍 [runAsync DEBUG] SQL CONVERTIDO:`
- `🔍 [runAsync DEBUG] PARAMS:`
- `📊 COMPARAÇÃO ANTES vs DEPOIS:`

3. **Query Manual no Banco:**
```sql
-- ANTES
SELECT * FROM faturamento WHERE id = 123;

-- UPDATE
UPDATE faturamento SET total = 36315.2 WHERE id = 123;

-- DEPOIS
SELECT * FROM faturamento WHERE id = 123;
```

---

## Possíveis Causas

### 1. Parameter Order Issue
**Sintoma:** UPDATE executa mas não atualiza valores corretos

**Causa:** Parâmetros estão na ordem errada

**Teste:**
```javascript
// O SQL espera: $1=data, $2=total, $3=categoria, $4=tipo, $5=tipo_despesa_id, $6=id
// Os params devem ser: [data, total, categoria, tipo, tipo_despesa_id, id]
```

Verificar no log `🔍 [runAsync DEBUG] PARAMS:` se estão exatamente nessa ordem.

### 2. Placeholder Conversion Bug
**Sintoma:** SQL convertido fica estranho, tipo `$7` quando deveria ser `$6`

**Causa:** Função `convertPlaceholders()` está contando placeholders incorretamente

**Teste:**
```javascript
// Contar quantos ? tem no SQL:
const sql = "UPDATE faturamento SET data = ?, total = ?, ... WHERE id = ?";
const count = (sql.match(/\?/g) || []).length;
console.log('Placeholders:', count);  // Deve ser 6
```

### 3. Transaction/Commit Issue
**Sintoma:** Query executa, rowCount=1, mas dado não persiste

**Causa:** Connection pool não está commitando a transação

**Teste:**
```javascript
// Ver se há transaction em aberto
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### 4. Trigger ou Constraint
**Sintoma:** Update executa mas valor volta ao anterior

**Causa:** Banco tem trigger ou constraint revertendo a mudança

**Teste:**
```sql
-- Ver triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'faturamento';

-- Ver constraints
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'faturamento';
```

---

## Template de Report para Investigação

Quando você testar, por favor compartilhe:

```
## Teste de UPDATE

### 1. Setup
- ID do registro: ___
- Valor original: ___
- Valor novo: ___
- Categoria: ___

### 2. Frontend
parseBrasilValue retorna: ___

### 3. Backend Logs
[COLAR LOGS DO SERVIDOR]

### 4. Comparação Antes vs Depois
[COLAR COMPARAÇÃO DO LOG]

### 5. Query Manual no Banco
ANTES: [RESULTADO DO SELECT]
UPDATE: [EXECUTADO?]
DEPOIS: [RESULTADO DO SELECT]

### 6. Conclusão
Qual camada falhou?
- [ ] Frontend (normalizando valor)
- [ ] API (enviando valor)
- [ ] Banco (atualizando)
```

---

## Recursos

- **Commits:** 032a31c (debug logging), fc1e099 (numero-parser)
- **Arquivos:** 
  - `backend/database.js` - runAsync()
  - `backend/models/Faturamento.js` - atualizarCompleto()
  - `backend/utils/numberParser.js` - parseBrasilValue()
  - `backend/frontend/js/utils/numberParser.js` - parseBrasilValue() (frontend)
