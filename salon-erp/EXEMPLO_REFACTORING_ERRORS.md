# 📝 Exemplo: Refatoração de Endpoint com Novo Error Handler

## ❌ ANTES (Messy)

```javascript
// backend/routes/api.js - POST /api/faturamentos (ANTIGO)
router.post('/faturamentos', createLimiter, async (req, res) => {
  try {
    const { data, total, categoria, tipo, tipo_despesa_id } = req.body;

    // Validações espalhadas e confusas
    if (!data || !total) {
      return res.status(400).json({
        success: false,
        error: 'Data e Total são obrigatórios'
      });
    }

    if (!categoria) {
      return res.status(400).json({
        success: false,
        error: 'Categoria é obrigatória'
      });
    }

    if (tipo !== 'receita' && tipo !== 'despesa') {
      return res.status(400).json({
        success: false,
        error: 'Tipo deve ser "receita" ou "despesa"'
      });
    }

    if (tipo === 'despesa' && !tipo_despesa_id) {
      return res.status(400).json({
        success: false,
        error: 'tipo_despesa_id é obrigatório para despesas'
      });
    }

    // ... resto do código

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message  // Genérico!
    });
  }
});
```

**Problemas:**
- ❌ Validações repetem padrão
- ❌ Mensagens genéricas
- ❌ Sem detalhes do campo
- ❌ Sem hints acionáveis
- ❌ Difícil de manter

---

## ✅ DEPOIS (Clean)

```javascript
// backend/routes/api.js - POST /api/faturamentos (NOVO)
const { ErrorTypes, Validators } = require('../utils/errorHandler');

router.post('/faturamentos', createLimiter, async (req, res, next) => {
  try {
    const { data, total, categoria, tipo, tipo_despesa_id } = req.body;

    // Validações claras e reutilizáveis
    Validators.requireFields({ data, total, categoria, tipo }, 
      ['data', 'total', 'categoria', 'tipo']);
    
    Validators.requireDate(data);
    Validators.requirePositive(total, 'total');
    Validators.requireEnum(tipo, ['receita', 'despesa'], 'tipo');
    
    // Validação condicional
    if (tipo === 'despesa') {
      Validators.requireType(tipo_despesa_id, 'number', 'tipo_despesa_id');
    }

    // ... resto do código (sem try/catch)
    const faturamento = await Faturamento.criar({
      data,
      total,
      categoria,
      tipo,
      tipo_despesa_id
    });

    res.json({
      success: true,
      data: faturamento
    });

  } catch (error) {
    next(error);  // Passa para middleware de erro
  }
});
```

**Benefícios:**
- ✅ Validações em 1 linha
- ✅ Mensagens específicas com hints
- ✅ Fácil adicionar validações
- ✅ Código mais legível
- ✅ Fácil manter

---

## 📊 Comparação: Respostas

### ❌ ANTES: Campo obrigatório faltando

**Requisição:**
```bash
POST /api/faturamentos
{"total": 100}  # Falta data, categoria, tipo
```

**Resposta:**
```json
{
  "success": false,
  "error": "Data e Total são obrigatórios"
}
```

**Problema:** Frontend não sabe qual campo exatamente está faltando!

---

### ✅ DEPOIS: Mesmo erro, mas claro

**Requisição:**
```bash
POST /api/faturamentos
{"total": 100}  # Falta data, categoria, tipo
```

**Resposta:**
```json
{
  "success": false,
  "error": {
    "code": "MISSING_FIELD",
    "message": "Campo obrigatório: \"data\"",
    "statusCode": 400,
    "timestamp": "2026-05-13T14:30:45.123Z",
    "details": {
      "field": "data",
      "hint": "Envie data no corpo da requisição (formato: YYYY-MM-DD)"
    }
  }
}
```

**Benefício:** Frontend sabe EXATAMENTE:
- Qual campo falta: `data`
- Como corrigir: "Envie data no formato YYYY-MM-DD"

---

## 🔄 Outro Exemplo: Valor Inválido

### ❌ ANTES

**Requisição:**
```bash
POST /api/faturamentos
{
  "data": "2026-05-13",
  "total": 100,
  "categoria": "Salão",
  "tipo": "transferencia"  # ❌ Inválido
}
```

**Resposta:**
```json
{
  "success": false,
  "error": "Tipo deve ser \"receita\" ou \"despesa\""
}
```

---

### ✅ DEPOIS

**Resposta:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_VALUE",
    "message": "Valor inválido: \"tipo\" = \"transferencia\"",
    "statusCode": 400,
    "details": {
      "field": "tipo",
      "value": "transferencia",
      "allowed": ["receita", "despesa"],
      "hint": "Permitidos: receita, despesa"
    }
  }
}
```

**Frontend pode fazer:**
```javascript
// Mostrar dropdown com valores permitidos
const allowedValues = error.error.details.allowed;
dropdown.setOptions(allowedValues);
```

---

## 🚀 Implementação Progressiva

Você **não precisa refatorar tudo de uma vez**. Pode fazer endpoint por endpoint:

### Fase 1: Endpoints Críticos (Esta semana)
```
✅ POST /api/auth/login
✅ POST /api/faturamentos
✅ PUT /api/faturamentos/:id
```

### Fase 2: CRUD Endpoints (Próxima semana)
```
⏳ DELETE /api/faturamentos/:id
⏳ POST /api/notas-fiscais/upload
⏳ POST /api/importar-conta-azul
```

### Fase 3: Endpoints Especializados (Conforme necessário)
```
⏳ POST /api/tipo-despesa
⏳ DELETE /api/notas-fiscais/:id
```

---

## 📋 Checklist de Refatoração

Para cada endpoint que refatorar:

```javascript
// 1. Imports no topo do arquivo
const { ErrorTypes, Validators } = require('../utils/errorHandler');

// 2. Adicionar (req, res, next) se não tiver
// ❌ router.post('/path', (req, res) => {
// ✅ router.post('/path', (req, res, next) => {

// 3. Substituir validações manuais
// ❌ if (!field) return res.status(400).json({...})
// ✅ Validators.requireFields({field}, ['field'])

// 4. Substituir manual errors
// ❌ throw new Error('Campo X obrigatório')
// ✅ throw ErrorTypes.MISSING_FIELD('X')

// 5. Adicionar next(error) no catch final
// ❌ catch (error) { res.status(400).json(...) }
// ✅ catch (error) { next(error) }
```

---

## 🧪 Como Testar

### Test 1: Campo Obrigatório Faltando
```bash
curl -X POST http://localhost:5006/api/faturamentos \
  -H "Content-Type: application/json" \
  -d '{"total": 100}'

# Resultado esperado: code = "MISSING_FIELD"
```

### Test 2: Valor Inválido
```bash
curl -X POST http://localhost:5006/api/faturamentos \
  -H "Content-Type: application/json" \
  -d '{
    "data": "2026-05-13",
    "total": 100,
    "categoria": "Salão",
    "tipo": "xyz"
  }'

# Resultado esperado: code = "INVALID_VALUE", allowed = ["receita", "despesa"]
```

### Test 3: Recurso Não Encontrado
```bash
curl -X PUT http://localhost:5006/api/faturamentos/999 \
  -H "Content-Type: application/json" \
  -d '{"total": 200}'

# Resultado esperado: code = "NOT_FOUND", statusCode = 404
```

---

## 📊 Antes vs Depois (Resumo)

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Código** | 20 linhas de validações | 5 linhas (Validators) |
| **Mensagem** | "Error" ou genérica | Específica com campo |
| **Detalhes** | Nenhum | field, hint, allowed, etc |
| **HTTP Code** | Sempre 400 | 400, 401, 404, 409, 500, 503 |
| **Frontend** | Adivinha o erro | Tem tudo pronto |
| **Debug** | Confuso | Claro (code + timestamp) |

---

## ⏭️ Próximos Passos

1. **Este commit:** Adicionar errorHandler.js e integrar no app.js ✅
2. **Próximo commit:** Refatorar POST /api/faturamentos
3. **Depois:** Refatorar POST /api/auth/login
4. **Depois:** Refatorar PUT /api/faturamentos/:id

**Quer que eu refatore um endpoint como exemplo?** 🚀
