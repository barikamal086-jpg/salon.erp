# 🧪 Plano de Testes - Salon ERP MVP

Este documento contém todos os testes para validar se o MVP está funcionando corretamente.

## ✅ Checklist de Testes Completos

---

## 1️⃣ TESTES DE INSTALAÇÃO E SETUP

### ✓ Teste 1.1: Verificar Node.js
```bash
node --version  # Deve retornar v16+ ou superior
npm --version   # Deve retornar 8.x ou superior
```
**Esperado:** Ambos retornam versões ✅

---

### ✓ Teste 1.2: Instalar Dependências
```bash
cd backend
npm install
```
**Esperado:** 
- Pasta `node_modules/` criada ✅
- Arquivo `package-lock.json` criado ✅
- Sem erros de instalação ✅

---

### ✓ Teste 1.3: Iniciar o Servidor
```bash
npm start
```
**Esperado:**
```
✅ Conectado ao SQLite: C:\...\salon-erp.db
✅ Tabela "faturamento" pronta
🚀 Servidor rodando em http://localhost:5000
📊 API disponível em http://localhost:5000/api/faturamentos
```

---

## 2️⃣ TESTES DE API (Backend)

### ✓ Teste 2.1: GET /api/faturamentos (Lista vazia)

```bash
curl http://localhost:5000/api/faturamentos
```

**Esperado:**
```json
{
  "success": true,
  "data": []
}
```

**Status HTTP:** 200 ✅

---

### ✓ Teste 2.2: POST /api/faturamentos (Criar)

```bash
curl -X POST http://localhost:5000/api/faturamentos \
  -H "Content-Type: application/json" \
  -d '{"data":"2024-04-10","total":1500.50}'
```

**Esperado:**
```json
{
  "success": true,
  "message": "Faturamento criado com sucesso",
  "id": 1
}
```

**Status HTTP:** 201 ✅

---

### ✓ Teste 2.3: GET /api/faturamentos (Com dados)

```bash
curl http://localhost:5000/api/faturamentos
```

**Esperado:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "data": "2024-04-10",
      "total": 1500.50,
      "status": 0,
      "enviado_em": null,
      "created_at": "2024-04-11 ..."
    }
  ]
}
```

**Status HTTP:** 200 ✅

---

### ✓ Teste 2.4: PUT /api/faturamentos/:id (Editar)

```bash
curl -X PUT http://localhost:5000/api/faturamentos/1 \
  -H "Content-Type: application/json" \
  -d '{"total":2000.00}'
```

**Esperado:**
```json
{
  "success": true,
  "message": "Faturamento atualizado com sucesso"
}
```

**Status HTTP:** 200 ✅

**Validação:** GET /api/faturamentos deve retornar total = 2000.00

---

### ✓ Teste 2.5: GET /api/faturamentos/stats (KPIs)

```bash
curl "http://localhost:5000/api/faturamentos/stats?from=2024-03-01&to=2024-04-30"
```

**Esperado:**
```json
{
  "success": true,
  "data": {
    "total": 2000.00,
    "media": 2000.00,
    "maior": 2000.00,
    "menor": 2000.00,
    "dias": 1
  }
}
```

**Status HTTP:** 200 ✅

---

### ✓ Teste 2.6: GET /api/faturamentos/chart (Dados Gráfico)

```bash
curl "http://localhost:5000/api/faturamentos/chart?from=2024-03-01&to=2024-04-30"
```

**Esperado:**
```json
{
  "success": true,
  "data": [
    {
      "data": "2024-04-10",
      "total": 2000.00
    }
  ]
}
```

**Status HTTP:** 200 ✅

---

### ✓ Teste 2.7: POST /api/faturamentos/:id/enviar-conta-azul

```bash
curl -X POST http://localhost:5000/api/faturamentos/1/enviar-conta-azul
```

**Esperado:**
```json
{
  "success": true,
  "message": "Faturamento marcado como enviado ao Conta Azul"
}
```

**Status HTTP:** 200 ✅

**Validação:** GET /api/faturamentos deve retornar status = 1 e enviado_em preenchido

---

### ✓ Teste 2.8: DELETE /api/faturamentos/:id

```bash
curl -X DELETE http://localhost:5000/api/faturamentos/1
```

**Esperado:**
```json
{
  "success": true,
  "message": "Faturamento deletado com sucesso"
}
```

**Status HTTP:** 200 ✅

**Validação:** GET /api/faturamentos deve retornar array vazio

---

### ✓ Teste 2.9: Validações (Erros)

#### Data Futura
```bash
curl -X POST http://localhost:5000/api/faturamentos \
  -H "Content-Type: application/json" \
  -d '{"data":"2025-12-31","total":1000}'
```
**Esperado:** Erro 400 - "Data não pode ser futura" ✅

#### Total Negativo
```bash
curl -X POST http://localhost:5000/api/faturamentos \
  -H "Content-Type: application/json" \
  -d '{"data":"2024-04-10","total":-100}'
```
**Esperado:** Erro 400 - "Total deve ser maior que zero" ✅

#### Campos Obrigatórios
```bash
curl -X POST http://localhost:5000/api/faturamentos \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Esperado:** Erro 400 - "Data e Total são obrigatórios" ✅

---

## 3️⃣ TESTES DE FRONTEND (UI)

### ✓ Teste 3.1: Carregar a Aplicação

1. Abra: http://localhost:5000
2. Aguarde carregamento

**Esperado:**
- ✅ Header com título "💅 Salon ERP"
- ✅ Formulário "📝 Lançar Faturamento" visível
- ✅ Cards de KPIs visíveis
- ✅ Gráfico carregado
- ✅ Tabela de histórico visível (vazia)

---

### ✓ Teste 3.2: Preencher Formulário

1. Clique no campo "Data"
2. Selecione 10/04/2024
3. Preencha Total: 1500
4. Clique "💾 Salvar"

**Esperado:**
- ✅ Mensagem de sucesso aparece
- ✅ Campos do formulário são limpos
- ✅ Receita aparece na tabela com:
  - Data: 10/04/2024
  - Total: R$ 1.500,00
  - Status: ⏳ Pendente

---

### ✓ Teste 3.3: Validações Frontend

#### Campo obrigatório (sem data)
1. Deixe data vazia
2. Preencha Total: 1500
3. Clique "Salvar"

**Esperado:** Campo obrigatório (HTML5) ✅

#### Total inválido
1. Preencha Data: 10/04/2024
2. Preencha Total: -100 ou 0
3. Clique "Salvar"

**Esperado:** Mensagem de erro: "Total deve ser maior que zero" ✅

#### Data futura
1. Preencha Data: 31/12/2025
2. Preencha Total: 1500
3. Clique "Salvar"

**Esperado:** Mensagem de erro: "Data não pode ser futura" ✅

---

### ✓ Teste 3.4: KPIs Dinâmicos

1. Selecione Data Início: 01/04/2024
2. Selecione Data Fim: 30/04/2024
3. Aguarde atualização

**Esperado:**
- ✅ Card "Total": R$ 1.500,00
- ✅ Card "Média Diária": R$ 1.500,00
- ✅ Card "Maior": R$ 1.500,00
- ✅ Card "Menor": R$ 1.500,00
- ✅ Card "Dias": 1

**Teste com múltiplos dias:**
1. Adicione mais receitas em dias diferentes:
   - 10/04: R$ 1.500,00
   - 11/04: R$ 2.000,00
   - 12/04: R$ 1.000,00
2. KPIs devem atualizar:
   - Total: R$ 4.500,00
   - Média: R$ 1.500,00
   - Maior: R$ 2.000,00
   - Menor: R$ 1.000,00
   - Dias: 3

---

### ✓ Teste 3.5: Gráfico

1. Com os dados do teste anterior, o gráfico deve:
   - ✅ Mostrar 3 pontos (dias 10, 11, 12)
   - ✅ Linha conectando os pontos
   - ✅ Y-axis com valores em R$
   - ✅ X-axis com datas
   - ✅ Hover mostra valor e data

**Teste responsivo:**
1. Maximize a janela → Gráfico expande ✅
2. Redimensione a janela → Gráfico ajusta ✅

---

### ✓ Teste 3.6: Tabela Histórico

Com dados de teste anterior, valide:

1. **Colunas:**
   - Data ✅
   - Total ✅
   - Status ✅
   - Ações ✅

2. **Ordem:** Mais recentes primeiro (descendente) ✅

3. **Formatação:**
   - Data: DD/MM/YYYY com dia da semana ✅
   - Total: R$ X.XXX,XX ✅
   - Status: 
     - ⏳ Pendente (em amarelo) ✅
     - ✅ Enviado (em verde) ✅

---

### ✓ Teste 3.7: Editar Receita

1. Na tabela, clique "✏️ Editar" na primeira receita
2. Modal abre com o total atual
3. Mude para 3000
4. Clique "Salvar"

**Esperado:**
- ✅ Modal fecha
- ✅ Total na tabela atualiza para R$ 3.000,00
- ✅ KPIs recalculam automaticamente
- ✅ Gráfico atualiza o ponto

---

### ✓ Teste 3.8: Deletar Receita

1. Na tabela, clique "🗑️ Deletar" em qualquer receita
2. Confirme "Tem certeza que deseja deletar?"

**Esperado:**
- ✅ Alerta de confirmação aparece
- ✅ Receita desaparece da tabela
- ✅ KPIs recalculam
- ✅ Gráfico atualiza

---

### ✓ Teste 3.9: Filtro por Status

1. Crie 2 receitas (ambas pendentes)
2. Envie 1 para Conta Azul
3. No dropdown, selecione "⏳ Pendente"

**Esperado:**
- ✅ Apenas 1 receita aparece na tabela
- ✅ KPIs recalculam apenas para 1 receita

4. Selecione "✅ Enviado"

**Esperado:**
- ✅ Apenas a receita enviada aparece

5. Selecione "Todos"

**Esperado:**
- ✅ Ambas as receitas aparecem

---

### ✓ Teste 3.10: Enviar ao Conta Azul

1. Na tabela, clique "📤 Enviar" em receita com status Pendente
2. Confirme

**Esperado:**
- ✅ Alerta de confirmação aparece
- ✅ Status muda para "✅ Enviado" (verde)
- ✅ Botão "📤 Enviar" desaparece
- ✅ Dados persistem (recarregue a página)

---

### ✓ Teste 3.11: Persistência de Dados

1. Adicione 5 receitas diferentes
2. Abra Developer Tools (F12)
3. Recarregue a página (Ctrl+R)

**Esperado:**
- ✅ Todas as 5 receitas ainda estão lá
- ✅ KPIs estão corretos
- ✅ Gráfico mostra todos os pontos
- ✅ Dados persistem no banco de dados

---

## 4️⃣ TESTES DE RESPONSIVIDADE

### ✓ Teste 4.1: Mobile (375px)

1. Abra DevTools (F12)
2. Selecione "iPhone 12" ou viewport 375x812
3. Navegue por toda a aplicação

**Esperado:**
- ✅ Formulário fica em 1 coluna
- ✅ KPIs em grid 1x5 (empilhados)
- ✅ Tabela com scroll horizontal (se necessário)
- ✅ Botões clicáveis (não sobrepostos)
- ✅ Texto legível (sem zoom necessário)

---

### ✓ Teste 4.2: Tablet (768px)

1. Selecione viewport 768x1024
2. Navegue por toda a aplicação

**Esperado:**
- ✅ Formulário em 2 colunas
- ✅ KPIs em grid (ajustado)
- ✅ Tabela com scroll suave
- ✅ Layout organizado

---

### ✓ Teste 4.3: Desktop (1280px)

1. Viewport 1280x800 ou maior
2. Navegue por toda a aplicação

**Esperado:**
- ✅ Layout completo com espaço
- ✅ KPIs em 5 colunas
- ✅ Tabela com todas as colunas visíveis
- ✅ Gráfico em tamanho grande
- ✅ Sem scroll horizontal desnecessário

---

## 5️⃣ TESTES DE PERFORMANCE

### ✓ Teste 5.1: Carregamento Inicial

1. Abra DevTools (Network)
2. Acesse http://localhost:5000
3. Aguarde carregamento completo

**Esperado:**
- ✅ HTML carrega < 500ms
- ✅ CSS carrega < 500ms
- ✅ JavaScript carrega < 1s
- ✅ API responde < 500ms
- ✅ Total < 3s

---

### ✓ Teste 5.2: Operações (Criar, Editar, Deletar)

1. Crie uma receita e meça tempo de resposta

**Esperado:**
- ✅ Mensagem de sucesso aparece em < 1s
- ✅ Tabela atualiza em < 500ms
- ✅ KPIs atualizam em < 500ms

---

## 6️⃣ TESTES DE COMPATIBILIDADE

### ✓ Teste 6.1: Navegadores

Teste em:
- [ ] Chrome/Edge (Recomendado)
- [ ] Firefox
- [ ] Safari (se tiver Mac)

**Esperado:** ✅ Funciona em todos

---

## 📊 Resumo de Testes

| Categoria | Testes | Status |
|-----------|--------|--------|
| Instalação | 3 | ✅ |
| API | 9 | ✅ |
| Frontend | 11 | ✅ |
| Responsividade | 3 | ✅ |
| Performance | 2 | ✅ |
| Compatibilidade | 1 | ✅ |
| **TOTAL** | **29** | **✅** |

---

## 🎉 MVP Validado!

Se todos os testes passarem, o MVP está **100% funcional** e pronto para:
- ✅ Uso em produção local
- ✅ Testes com Kamal
- ✅ Deploy em Railway/Heroku
- ✅ Expansão para próximos módulos

---

**Data:** 2024-04-11  
**Versão:** 1.0.0 MVP  
**Status:** ✅ Pronto para testes
