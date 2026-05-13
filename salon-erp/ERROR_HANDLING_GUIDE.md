# 🚨 Guia de Error Handling Profissional

**Data:** 2026-05-13  
**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO

---

## 📋 O Problema Atual

```json
// ❌ ANTES (Confuso)
{
  "success": false,
  "error": "Invalid value"  // Qual valor? O quê é inválido?
}

// ✅ DEPOIS (Claro)
{
  "success": false,
  "error": {
    "code": "INVALID_VALUE",
    "message": "Valor inválido: \"tipo\" = \"xyz\"",
    "statusCode": 400,
    "timestamp": "2026-05-13T14:30:45.123Z",
    "details": {
      "field": "tipo",
      "value": "xyz",
      "allowed": ["receita", "despesa"],
      "hint": "Permitidos: receita, despesa"
    }
  }
}
```

---

## 🎯 Tipos de Erro (HTTP Codes Corretos)

| HTTP | Tipo | Quando | Exemplo |
|------|------|--------|---------|
| **400** | VALIDATION_ERROR | Campo obrigatório falta, formato inválido | `data` está vazio |
| **401** | UNAUTHORIZED | Token inválido/expirado, sem permissão | Login expirou |
| **404** | NOT_FOUND | Recurso não existe | Faturamento ID 999 não existe |
| **409** | CONFLICT | Recurso duplicado, estado conflitante | Email já cadastrado |
| **429** | RATE_LIMITED | Limite de requisições excedido | Muitos logins |
| **500** | SERVER_ERROR | Erro interno, banco de dados | Falha ao salvar |
| **503** | SERVICE_UNAVAILABLE | Serviço externo fora | Conta Azul down |

---

## 💡 Exemplos Práticos de Uso

### ❌ Exemplo 1: Campo Obrigatório Faltando

**Requisição:**
```bash
POST /api/faturamentos
Content-Type: application/json

{
  "total": 100.00,
  "categoria": "Salão"
  // ❌ Falta "data"
}
```

**Resposta (Antes):**
```json
{
  "success": false,
  "error": "Data e Total são obrigatórios"
}
```

**Resposta (Depois):**
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

**Frontend (Como exibir):**
```javascript
catch(error) {
  const err = error.response.data.error;
  
  // Opção 1: Mostrar hint
  alert(err.details?.hint);
  
  // Opção 2: Destacar campo no formulário
  document.getElementById(err.details?.field).style.border = '2px solid red';
  
  // Opção 3: Log estruturado
  console.error(`[${err.code}] ${err.message}`);
}
```

---

### ❌ Exemplo 2: Valor Inválido (Enum)

**Requisição:**
```bash
POST /api/faturamentos
{
  "data": "2026-05-13",
  "total": 100.00,
  "categoria": "Salão",
  "tipo": "transferencia"  // ❌ Inválido! Só aceita "receita" ou "despesa"
}
```

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

---

### ❌ Exemplo 3: Recurso Não Encontrado (404)

**Requisição:**
```bash
PUT /api/faturamentos/999
{
  "total": 200.00
}
```

**Resposta:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Faturamento não encontrado: ID 999",
    "statusCode": 404,
    "details": {
      "resource": "Faturamento",
      "id": "999",
      "hint": "Verifique se o Faturamento existe"
    }
  }
}
```

---

### ❌ Exemplo 4: Autorização Negada (401)

**Requisição:**
```bash
GET /api/faturamentos
Authorization: Bearer expired_token_123
```

**Resposta:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token inválido ou expirado",
    "statusCode": 401,
    "details": {
      "hint": "Faça login novamente para obter um novo token"
    }
  }
}
```

---

### ❌ Exemplo 5: Duplicado (409)

**Requisição:**
```bash
POST /api/faturamentos
{
  "data": "2026-05-13",
  "total": 100.00,
  "categoria": "Salão",
  "tipo": "receita",
  "numero_nf": "NF-001"  // ❌ Já existe!
}
```

**Resposta:**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE",
    "message": "Já existe: \"numero_nf\" = \"NF-001\"",
    "statusCode": 409,
    "details": {
      "field": "numero_nf",
      "value": "NF-001",
      "hint": "Use um valor único para numero_nf"
    }
  }
}
```

---

### ❌ Exemplo 6: Erro de Servidor (500)

**Requisição:**
```bash
POST /api/faturamentos
{
  "data": "2026-05-13",
  "total": 100.00,
  "categoria": "Salão",
  "tipo": "receita"
}
```

**Resposta (Banco de dados desconectado):**
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Erro ao salvar no banco de dados",
    "statusCode": 500,
    "timestamp": "2026-05-13T14:30:45.123Z",
    "details": {
      "operation": "INSERT",
      "hint": "Tente novamente mais tarde. Se persistir, contate o administrador"
    }
  }
}
```

---

## 🔧 Como Usar no Backend

### Antes (Manual):
```javascript
router.post('/faturamentos', async (req, res) => {
  const { data, total, categoria, tipo } = req.body;
  
  if (!data || !total) {
    return res.status(400).json({
      success: false,
      error: 'Data e Total são obrigatórios'
    });
  }
  
  if (tipo !== 'receita' && tipo !== 'despesa') {
    return res.status(400).json({
      success: false,
      error: 'Tipo inválido'
    });
  }
  
  // ... resto do código
});
```

### Depois (Com Error Handler):
```javascript
const { ErrorTypes, Validators } = require('../utils/errorHandler');

router.post('/faturamentos', async (req, res, next) => {
  try {
    const { data, total, categoria, tipo } = req.body;
    
    // Validações claras e reutilizáveis
    Validators.requireFields({ data, total }, ['data', 'total']);
    Validators.requireDate(data);
    Validators.requirePositive(total, 'total');
    Validators.requireEnum(tipo, ['receita', 'despesa'], 'tipo');
    
    // ... resto do código
    
  } catch (error) {
    next(error);  // Passa para middleware de erro
  }
});
```

---

## 📱 Frontend: Como Exibir Erros

### Opção 1: Toast com Hint
```javascript
async function salvarFaturamento() {
  try {
    const response = await axios.post('/api/faturamentos', dados);
    toast.success('Salvo com sucesso!');
  } catch (error) {
    const err = error.response?.data?.error;
    toast.error(err?.details?.hint || err?.message);
  }
}
```

### Opção 2: Highlight Campo + Mensagem
```javascript
async function salvarFaturamento() {
  try {
    const response = await axios.post('/api/faturamentos', dados);
  } catch (error) {
    const err = error.response?.data?.error;
    
    if (err?.details?.field) {
      const field = document.getElementById(err.details.field);
      field?.classList.add('input-error');
      field?.focus();
    }
    
    alert(err?.details?.hint || err?.message);
  }
}
```

### Opção 3: Modal com Detalhes
```javascript
function showErrorModal(error) {
  const err = error.response?.data?.error;
  
  modal.show({
    title: `❌ ${err.code}`,
    message: err.message,
    hint: err.details?.hint,
    suggestions: err.details?.allowed?.map(v => `• ${v}`)
  });
}
```

---

## 🚀 Implementação (Passo a Passo)

### 1. Integrar no App.js
```javascript
// backend/app.js
const { errorHandler } = require('./utils/errorHandler');

// ... depois das rotas
app.use('/api', apiRoutes);
app.use('/debug', debugRoutes);

// ← Middleware de erro (DEVE SER POR ÚLTIMO)
app.use(errorHandler);
```

### 2. Usar nos Endpoints
```javascript
// Antes (genérico)
if (!email) {
  return res.status(400).json({ error: 'Email obrigatório' });
}

// Depois (específico)
const { ErrorTypes, Validators } = require('../utils/errorHandler');

if (!email) {
  throw ErrorTypes.MISSING_FIELD('email');
}
```

### 3. Testar
```bash
# Campo faltando
curl -X POST http://localhost:5006/api/faturamentos \
  -H "Content-Type: application/json" \
  -d '{"total": 100}'

# Resultado: MISSING_FIELD com hint claro
```

---

## ✅ Benefícios

| Antes | Depois |
|-------|--------|
| ❌ Erro genérico "400 Bad Request" | ✅ Código específico: MISSING_FIELD, INVALID_VALUE, etc |
| ❌ Mensagem vaga: "Invalid value" | ✅ Mensagem clara com o campo exato |
| ❌ Frontend adivinha o problema | ✅ Details com `hint` acionável |
| ❌ HTTP code sempre 400 | ✅ HTTP codes corretos (401, 404, 409, etc) |
| ❌ Difícil debugar em produção | ✅ Timestamp e código de erro para logs |

---

## 📊 Implementação Status

- ✅ errorHandler.js criado
- ⏳ Integrar no app.js
- ⏳ Refatorar endpoints críticos (login, faturamentos, uploads)
- ⏳ Testar responses
- ⏳ Documentar para frontend

**Quer que eu implemente nos endpoints?** 🚀

---

**Status:** PRONTO PARA INTEGRAÇÃO | **Complexidade:** BAIXA | **Impacto:** ALTO
