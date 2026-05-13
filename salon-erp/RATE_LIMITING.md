# 🔐 Rate Limiting - Proteção do ERP Salon

**Data:** 2026-05-13  
**Status:** ✅ IMPLEMENTADO

---

## 📋 O Que É Rate Limiting?

Rate Limiting é uma técnica de segurança que **limita o número de requisições** que um cliente pode fazer em um período de tempo. Protege o servidor contra:

- ✅ **DDoS (Distributed Denial of Service)** - Ataques com milhares de requisições
- ✅ **Brute Force** - Tentativas múltiplas de login/senha
- ✅ **Web Scraping** - Roubo de dados automatizado
- ✅ **API Abuse** - Uso excessivo de recursos

---

## 🎯 Estratégia Implementada

### Limites por Tipo de Operação

| Endpoint | Tipo | Limite | Janela | Descrição |
|----------|------|--------|--------|-----------|
| **POST /auth/login** | Login | 5 req | 1 min | Proteção contra brute force |
| **POST /faturamentos** | Create | 50 req | 1 min | Criação de receitas/despesas |
| **PUT /faturamentos/:id** | Update | 200 req | 1 min | Edição de registros |
| **DELETE /faturamentos/:id** | Delete | 20 req | 1 min | Deleção de registros |
| **POST /tipo-despesa** | Create | 50 req | 1 min | Criar tipos de despesa |
| **DELETE /notas-fiscais/:id** | Delete | 20 req | 1 min | Deletar notas |
| **POST /processar-despesa-imagem** | Upload | 10 req | 1 hora | Upload de imagens OCR |
| **POST /notas-fiscais/upload** | Upload | 10 req | 1 hora | Upload de notas fiscais |
| **POST /importar-conta-azul** | Upload | 10 req | 1 hora | Import de dados |
| **GET /debug/** | Debug | 50 req | 10 min | Endpoints de debug |
| **Todos (default)** | API | 100 req | 1 min | Limite geral para qualquer rota |

---

## 🛠️ Como Funciona

### Identificação por IP

O rate limiter rastreia requisições por **IP do cliente**. Cada IP tem um contador que:
1. **Incrementa** cada vez que uma requisição chega
2. **Reseta** quando a janela de tempo expira
3. **Bloqueia** se o limite for excedido

### Exemplo: Login com 5 tentativas/minuto

```
IP: 192.168.1.100
Tentativa 1: ✅ Permitida
Tentativa 2: ✅ Permitida
Tentativa 3: ✅ Permitida
Tentativa 4: ✅ Permitida
Tentativa 5: ✅ Permitida
Tentativa 6: ❌ BLOQUEADA - "Muitas tentativas de login. Tente novamente em 1 minuto."

[Após 1 minuto]
Tentativa 6: ✅ Permitida (contador resetou)
```

---

## 📊 Respostas de Erro

Quando o limite é atingido, o servidor retorna **HTTP 429 (Too Many Requests)**:

```json
{
  "success": false,
  "error": "Muitas tentativas de login. Aguarde 1 minuto antes de tentar novamente."
}
```

Headers HTTP incluem informações sobre o limite:
```
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1715606280
```

---

## 🔧 Configuração

### Arquivo: `backend/middleware/rateLimiter.js`

Cada limiter é configurável com:
- `windowMs` - Janela de tempo (em ms)
- `max` - Número máximo de requisições
- `message` - Mensagem de erro
- `skip` - Função para pular o limiter (ex: em desenvolvimento)
- `keyGenerator` - Como identificar o cliente (padrão: IP)

**Exemplo de modificação:**

```javascript
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,    // ← Alterar para 2 minutos: 2 * 60 * 1000
  max: 5,                      // ← Alterar para 10 tentativas
  // ...
});
```

### Desabilitar em Desenvolvimento

Por padrão, rate limiting é **desabilitado em desenvolvimento** (`NODE_ENV === 'development'`).

Para forçar em desenvolvimento, remova ou altere a função `skip`:

```javascript
skip: (req, res) => false,  // Força o rate limit mesmo em dev
```

---

## 🚨 Situações Comuns

### Quando um usuário vê "Limite de requisições excedido"?

**Possíveis causas:**
1. **Login**: 5+ tentativas de login falhadas em 1 minuto
2. **Múltiplas edições rápidas**: +200 edições em 1 minuto (improvável)
3. **Upload em loop**: +10 uploads em 1 hora
4. **Bot/Script**: Requisições automatizadas muito rápidas

**Solução:**
- Aguardar a janela de tempo expirar
- Verificar se há algum script enviando requisições
- Contato admin se acredita ser um erro

---

## 📈 Monitoramento

Quando um rate limit é acionado, aparece no console:

```
⚠️ [LOGIN] Rate limit atingido para: 192.168.1.100
⚠️ [UPLOAD] Rate limit atingido para: 203.45.67.89
⚠️ [DELETE] Rate limit atingido para: 10.0.0.1 - Rota: /api/faturamentos/123
```

---

## 🔄 Ajustes Recomendados

### Para Produção

Os limites atuais são conservadores. Em produção, ajuste conforme necessário:

**Se usuários reclamam de "limite excedido":**
```javascript
// Aumentar de 50 para 100 criações por minuto
max: 100
```

**Se há preocupações de segurança (muitos ataques):**
```javascript
// Reduzir de 100 para 50 requisições por minuto
max: 50
```

**Se upload está lento (limite por hora):**
```javascript
// Aumentar de 10 para 20 uploads por hora
max: 20
```

---

## 📋 Checklist de Implementação

- ✅ Package instalado: `express-rate-limit` v6.10.0
- ✅ Arquivo criado: `backend/middleware/rateLimiter.js`
- ✅ Importado em: `backend/app.js` (limite geral)
- ✅ Importado em: `backend/routes/api.js` (limites específicos)
- ✅ Importado em: `backend/routes/debug.js` (debug limiters)
- ✅ 9 endpoints com rate limiting específico
- ✅ 1 limite geral aplicado a TODAS as rotas
- ✅ Desabilitado em desenvolvimento por padrão
- ✅ Logs informativos quando limite é acionado

---

## 🚀 Próximos Passos Possíveis

1. **Redis Store** - Usar Redis em vez de memória para distribuir limites em múltiplos servidores (Railway)
2. **Limit por User** - Em vez de por IP, limitar por usuário autenticado
3. **Whitelist** - IPs confiáveis que não sofrem rate limiting
4. **Alert System** - Notificar admin quando há muitos bloqueios
5. **Analytics** - Dashboard mostrando padrões de abuso

---

## 📚 Referência

**Documentação:** https://github.com/nfriedly/express-rate-limit  
**Expressjs:** https://expressjs.com/en/resources/middleware/rate-limit.html

---

**Status:** ✅ PRONTO PARA PRODUÇÃO
