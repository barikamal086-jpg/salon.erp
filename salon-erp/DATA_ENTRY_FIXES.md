# DATA ENTRY - CORREÇÕES IMPLEMENTADAS

Data: 2026-05-02 | Status: ✅ PRODUÇÃO

---

## 1. Validação de Tipo (Case Sensitive)

**Problema:** 
- Frontend envia `"Receita"` (capitalizado)
- Backend valida contra `['receita', 'despesa']` (minúsculas)
- Resultado: Erro 400 Bad Request

**Solução Implementada:**
```javascript
// Backend (api.js, linha 301):
if (tipo && !['receita', 'despesa'].includes(tipo.toLowerCase())) {
  return res.status(400).json({...});
}

// Modelo (Faturamento.js):
const tipoNormalizado = tipo.toLowerCase();
if (!['receita', 'despesa'].includes(tipoNormalizado)) {
  throw new Error('Tipo deve ser "receita" ou "despesa"');
}
```

**Commits:** `5fafe1c`, `3f4246b`

---

## 2. Formato de Data (ISO Timestamps)

**Problema:**
- API retorna: `"2026-04-07T00:00:00.000Z"` (ISO timestamp)
- Campo `input[type=date]` espera: `"2026-04-07"` (YYYY-MM-DD)
- Resultado: Erro "Data inválida" no console

**Solução Implementada:**
```javascript
// Frontend (formatarData, linha 2584):
if (data.includes('T')) {
  data = data.split('T')[0];  // "2026-04-07T00:00:00Z" → "2026-04-07"
}

// Formato consistente:
const dia = String(dataLocal.getDate()).padStart(2, '0');
const mes = String(dataLocal.getMonth() + 1).padStart(2, '0');
const ano = dataLocal.getFullYear();
return `${diaSemana}, ${dia}/${mes}/${ano}`;  // "qua., 07/04/2026"
```

**Commits:** `c10c8c6`, `678b807`

---

## 3. Filtro de Período

**Problema:**
- Período padrão: 02/04/2026 a 02/05/2026 (mês atual)
- Lançamento inserido em 01/04/2026 fica **fora do período**
- Resultado: Não aparece na listagem

**Solução Implementada:**
```javascript
// Frontend (data(), linha 1577):
periodo: {
  dataInicio: this.obterData90DiasAtras(),  // 90 dias atrás
  dataFim: this.obterDataHoje()             // hoje
}

// Auto-ajuste ao inserir novo lançamento:
if (dataNoveLancamento < this.filtroHistorico.dataInicio) {
  this.filtroHistorico.dataInicio = dataNoveLancamento;
}
if (dataNoveLancamento > this.filtroHistorico.dataFim) {
  this.filtroHistorico.dataFim = dataNoveLancamento;
}
```

**Commits:** `3f994ee`, `0cc8653`, `ca8ef1e`

**Regra:** Após inserir/editar lançamento, o filtro se ajusta automaticamente para incluir a data.

---

## 4. Prevenção de Duplicatas

**Problema:**
- Editar um lançamento múltiplas vezes criava cópias
- Razão: Botão clicado várias vezes, cada clique = INSERT

**Verificação:**
- ✅ Backend usa `UPDATE` (não INSERT) em PUT /faturamentos/:id
- ✅ Validação dupla: API + Modelo

**Implementação existente:**
- `/api/debug/verificar-duplicatas` - Detecta duplicatas
- `/api/debug/limpar-duplicatas` - Remove duplicatas mantendo mais recente

---

## 5. Remoção de Duplicatas Existentes

**Endpoint criado:**
```bash
POST /api/debug/limpar-duplicatas
```

**Lógica:**
```
Para cada grupo de duplicatas (data + valor + categoria):
1. Manter: ID mais antigo (primeiro inserido)
2. Deletar: Todos os outros IDs
```

**Commit:** `ebb5c95`

---

## REGRAS DE OURO PARA DATA ENTRY

1. **Validação de Case Sensitive**
   - ✅ Sempre usar `.toLowerCase()` antes de validar
   - ✅ Normalizar campo antes de salvar no banco

2. **Formato de Data**
   - ✅ Sempre usar ISO `YYYY-MM-DD` internamente
   - ✅ Converter ISO timestamps: `data.split('T')[0]`
   - ✅ Exibir em PT-BR: `DD/MM/YYYY` (dia da semana)

3. **Período Filtrado**
   - ✅ Padrão: Últimos 90 dias até hoje
   - ✅ Nunca filtrar apenas mês atual
   - ✅ Auto-ajustar ao inserir fora do período

4. **Operações CRUD**
   - ✅ POST: Inserir novo (criar)
   - ✅ PUT: Atualizar existente (UPDATE, nunca INSERT)
   - ✅ DELETE: Remover registro
   - ✅ Sempre recarregar listagem após qualquer operação

5. **Feedback ao Usuário**
   - ✅ Exibir período claro: "Mostrando: 01/04/2026 a 02/05/2026"
   - ✅ Avisar se lançamento está fora do período
   - ✅ Confirmação: "✅ Lançamento adicionado com sucesso!"

---

## TESTE DE VERIFICAÇÃO

### Teste 1: Case Sensitive
```
Ação: Enviar "Receita" (R maiúsculo)
Esperado: ✅ Aceito e salvo como 'receita'
Verificar: No banco: SELECT tipo FROM faturamento WHERE id = X;
```

### Teste 2: Formato de Data
```
Ação: Salvar lançamento com data "2026-04-07"
Esperado: ✅ Armazenado como "2026-04-07"
Verificar: No console: formatarData() retorna "qua., 07/04/2026"
```

### Teste 3: Edição (não duplicação)
```
Ação: Editar lançamento existente → clicar Salvar
Esperado: ✅ Total de registros NÃO aumenta
Verificar: SELECT COUNT(*) FROM faturamento; (mesmo número)
```

### Teste 4: Filtro de Período
```
Ação: Inserir lançamento com data 01/04/2026
Esperado: ✅ Aparece imediatamente na listagem
Verificar: Sem mensagem "⊗ Fora do período"
```

### Teste 5: Recarregamento
```
Ação: Adicionar → Deletar → Editar → Limpar Filtros
Esperado: ✅ Listagem sempre reflete estado atual
Verificar: Console não mostra erros de sincronismo
```

---

## REFERÊNCIA PARA FUTURO

### Se erro 400 em Data Entry:

**Checklist de Debug:**

1. **Case Sensitive?**
   - Procurar por `includes(tipo)` sem `.toLowerCase()`
   - Solução: Adicionar `.toLowerCase()`

2. **Formato de Data?**
   - Procurar por `2026-04-07T00:00:00Z` em campos YYYY-MM-DD
   - Solução: Adicionar `if (data.includes('T')) data = data.split('T')[0]`

3. **Filtro de Período?**
   - Verificar `dataInicio` e `dataFim` no console
   - Lançamento fora do período?
   - Solução: Ajustar para 90 dias ou incluir data manualmente

4. **Duplicatas?**
   - Mesmos dados aparecendo múltiplas vezes?
   - Verificar: `GET /api/debug/verificar-duplicatas`
   - Limpar: `POST /api/debug/limpar-duplicatas`

5. **PUT vs POST?**
   - Edição criando novo registro?
   - Verificar: endpoint está usando `axios.put()` não `axios.post()`
   - Backend está usando `UPDATE` não `INSERT`

---

## COMMITS RELACIONADOS

| Commit | Descrição |
|--------|-----------|
| `5fafe1c` | Fix tipo case-sensitive (PUT endpoint) |
| `3f4246b` | Fix tipo case-sensitive (POST endpoint + Model) |
| `c10c8c6` | Fix date format ISO timestamps |
| `678b807` | Date formatting + DELETE debugging |
| `3f994ee` | Change filter from monthly to 90 days |
| `0cc8653` | Auto-adjust filter when adding new entry |
| `ca8ef1e` | Use consistent 90-day period everywhere |
| `ebb5c95` | Add cleanup endpoint for duplicates |

---

## STATUS

✅ **Todas as correções implementadas e testadas**
✅ **Documentação completa**
✅ **Pronto para produção**

Data: 2026-05-02
Versão: v1.0 (Data Entry Fixes)
