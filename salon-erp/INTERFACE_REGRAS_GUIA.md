# Interface de Gerenciamento de Regras por Fornecedor

**Data:** 2026-05-04 | **Status:** ✅ Implementado e Testável | **Commit:** `f4366a4`

---

## 📋 O Que Foi Implementado

### 1. Modal Visual (Frontend - index.html)

**Localização:** Linha 1527 a 1607 (nova seção de modal)

**Componentes:**
- ⚙️ Botão "Gerenciar Regras por Fornecedor" na seção de Notas (linha 473-477)
- Modal responsivo com 2 seções:
  - **➕ Cadastrar Nova Regra** (formulário)
  - **📋 Regras Cadastradas** (listagem)

**Elementos do Formulário:**
```html
- Input: Nome do Fornecedor (texto)
- Select: Categoria (Tipo de Despesa) - preenchido dinamicamente
- Botões: Cadastrar Regra, Limpar
```

**Listagem de Regras:**
- Mostra todas as regras cadastradas
- Displays: Fornecedor → Categoria (Classificação)
- Botões por regra: ✏️ Editar, 🗑️ Deletar
- Mensagem de "sem regras" quando vazio

---

## 🔧 Vue Integration (Frontend)

### Data Properties Adicionadas (linhas 1784-1794)

```javascript
mostrarModalRegras: false,           // Controla visibilidade do modal
novaRegra: {                          // Formulário de nova regra
  fornecedor_nome: '',
  tipo_despesa_id: null
},
regrasLista: [],                      // Lista de regras (GET /api/regras-categoria)
carregandoRegras: false,              // Flag de loading
mensagemRegras: '',                   // Mensagem feedback (sucesso/erro)
tipoMensagemRegras: 'sucesso',        // Tipo da mensagem
regraEmEdicao: null                   // Regra sendo editada
```

### Watcher Adicionado (linhas 1808-1819)

```javascript
watch: {
  mostrarModalRegras(newVal) {
    if (newVal) {
      // Carregar regras quando modal abre
      this.carregarRegras();
    } else {
      // Limpar formulário quando modal fecha
      this.novaRegra = { fornecedor_nome: '', tipo_despesa_id: null };
      this.regraEmEdicao = null;
      this.mensagemRegras = '';
    }
  }
}
```

**Comportamento:** Quando `mostrarModalRegras` muda para `true`, automaticamente carrega as regras da API.

### Métodos Adicionados (linhas 3411-3503)

#### 1. `carregarRegras()` (linhas 3411-3441)

```javascript
async carregarRegras() {
  // GET /api/regras-categoria
  // Carrega lista de regras
  // Auto-inicializa tabela se não existe (POST /api/debug/init-regras)
  // Sets: this.regrasLista
}
```

**Behavior:**
- Faz GET para `/api/regras-categoria`
- Se tabela não existe, tenta POST `/api/debug/init-regras`
- Mostra mensagens de sucesso/erro
- Desabilita botões durante carregamento

#### 2. `salvarRegra()` (linhas 3443-3479)

```javascript
async salvarRegra() {
  // Valida campos obrigatórios
  // POST /api/regras-categoria (nova)
  // PUT /api/regras-categoria/:id (edição)
  // Recarrega lista
  // Limpa formulário
  // Exibe mensagem de sucesso
}
```

**Validações:**
- `fornecedor_nome` não pode ser vazio
- `tipo_despesa_id` deve ser selecionado

#### 3. `editarRegra(regra)` (linhas 3481-3487)

```javascript
editarRegra(regra) {
  // Preenche formulário com dados existentes
  // Sets: this.regraEmEdicao
  // Sets: this.novaRegra (para edição)
}
```

#### 4. `deletarRegra(id)` (linhas 3489-3503)

```javascript
async deletarRegra(id) {
  // DELETE /api/regras-categoria/:id
  // Pede confirmação com confirm()
  // Recarrega lista
  // Exibe mensagem de sucesso
}
```

---

## 🌐 API Functions (api.js)

### Funções Existentes (linhas 165-196)

```javascript
// CREATE
api.cadastrarRegra(fornecedor_nome, tipo_despesa_id)
  // POST /api/regras-categoria

// READ
api.listarRegras()
  // GET /api/regras-categoria

// SEARCH
api.obterRegraPorFornecedor(fornecedor)
  // GET /api/regras-categoria/buscar/:fornecedor

// UPDATE
api.atualizarRegra(id, tipo_despesa_id)
  // PUT /api/regras-categoria/:id

// DELETE
api.deletarRegra(id)
  // DELETE /api/regras-categoria/:id
```

---

## ⚙️ Backend Endpoints

### 1. POST /api/regras-categoria

**Descrição:** Criar nova regra (ou atualizar se já existe)

**Request:**
```json
{
  "fornecedor_nome": "MAXIS",
  "tipo_despesa_id": 5
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "regra": {
    "id": 1,
    "fornecedor_nome": "MAXIS",
    "tipo_despesa_id": 5,
    "subcategoria": "Hortifruti",
    "classificacao": "CMV",
    "ativo": true
  }
}
```

---

### 2. GET /api/regras-categoria

**Descrição:** Listar todas as regras

**Response:**
```json
{
  "success": true,
  "quantidade": 2,
  "regras": [
    {
      "id": 1,
      "fornecedor_nome": "MAXIS",
      "tipo_despesa_id": 5,
      "subcategoria": "Hortifruti",
      "classificacao": "CMV",
      "ativo": true
    },
    {
      "id": 2,
      "fornecedor_nome": "Fornecedor X",
      "tipo_despesa_id": 8,
      "subcategoria": "Bebidas",
      "classificacao": "CMV",
      "ativo": true
    }
  ]
}
```

---

### 3. GET /api/regras-categoria/buscar/:fornecedor

**Descrição:** Buscar regra por nome do fornecedor

**Exemplo:** `GET /api/regras-categoria/buscar/MAXIS`

**Response:**
```json
{
  "success": true,
  "regra": {
    "id": 1,
    "fornecedor_nome": "MAXIS",
    "tipo_despesa_id": 5,
    "subcategoria": "Hortifruti",
    "classificacao": "CMV",
    "ativo": true
  }
}
```

---

### 4. PUT /api/regras-categoria/:id

**Descrição:** Atualizar regra existente

**Exemplo:** `PUT /api/regras-categoria/1`

**Request:**
```json
{
  "tipo_despesa_id": 7
}
```

**Response:**
```json
{
  "success": true,
  "regra": { ... }
}
```

---

### 5. DELETE /api/regras-categoria/:id

**Descrição:** Deletar regra

**Exemplo:** `DELETE /api/regras-categoria/1`

**Response:**
```json
{
  "success": true,
  "message": "Regra deletada com sucesso"
}
```

---

### 6. POST /api/debug/init-regras

**Descrição:** Inicializar tabela (chamado automaticamente se necessário)

**Response:**
```json
{
  "success": true,
  "message": "Tabela criada com sucesso"
}
```

---

## 🧪 Teste Manual - Guia Passo a Passo

### Pré-requisitos
1. Sistema rodando (Railway ou localhost)
2. Usuário autenticado (login realizado)
3. Dados de exemplo já importados

### Teste 1: Abrir Modal

**Passos:**
1. Navegar para seção "📄 Processar Notas Fiscais"
2. Clicar em botão "⚙️ Gerenciar Regras por Fornecedor"

**Esperado:**
- ✅ Modal abre
- ✅ Formulário vazio pronto para input
- ✅ Listagem carrega (pode estar vazia inicialmente)
- ✅ Sem erros no console

**Console Expected:**
```
✅ Regras carregadas: 0
```

---

### Teste 2: Cadastrar Primeira Regra

**Dados:**
- Fornecedor: `MAXIS`
- Categoria: Selecionar "Hortifruti" (CMV)

**Passos:**
1. Digitar "MAXIS" no campo "Nome do Fornecedor"
2. Selecionar "Hortifruti" no dropdown de Categoria
3. Clicar em "💾 Cadastrar Regra"

**Esperado:**
- ✅ Botão desabilita durante salvamento
- ✅ Mensagem: "✅ Regra cadastrada: MAXIS"
- ✅ Formulário limpa
- ✅ Regra aparece na listagem

**Console Expected:**
```
📊 Importação Conta Azul iniciada
✅ Regra criada com sucesso
✅ Regras carregadas: 1
```

---

### Teste 3: Cadastrar Segunda Regra

**Dados:**
- Fornecedor: `DISTRIBUIDORA BEBIDAS`
- Categoria: Selecionar "Bebidas" (CMV)

**Passos:**
1. Digitar "DISTRIBUIDORA BEBIDAS"
2. Selecionar "Bebidas"
3. Clicar "💾 Cadastrar Regra"

**Esperado:**
- ✅ Regra adicionada à listagem
- ✅ Total agora mostra "2 Regras Cadastradas"
- ✅ Ambas aparecem na listagem

---

### Teste 4: Editar Regra

**Passos:**
1. Na listagem, encontrar regra "MAXIS"
2. Clicar em botão "✏️ Editar"

**Esperado:**
- ✅ Formulário preenche com dados atuais
- ✅ Fornecedor: "MAXIS"
- ✅ Categoria: "Hortifruti" (selecionado)

**Continuar Edição:**
1. Selecionar categoria diferente (ex: "Alimentos")
2. Clicar "💾 Cadastrar Regra" (mesmo botão)

**Esperado:**
- ✅ Mensagem: "✅ Regra atualizada com sucesso!"
- ✅ Listagem reflete mudança: "MAXIS → Alimentos"

---

### Teste 5: Deletar Regra

**Passos:**
1. Na listagem, clicar "🗑️ Deletar" em qualquer regra
2. Confirmação: "Tem certeza que deseja deletar?"
3. Clicar "OK"

**Esperado:**
- ✅ Mensagem: "✅ Regra deletada com sucesso!"
- ✅ Regra desaparece da listagem
- ✅ Total atualiza ("1 Regra Cadastrada")

---

### Teste 6: Validação

**Passos:**
1. Deixar Fornecedor vazio
2. Tentar clicar "💾 Cadastrar Regra"

**Esperado:**
- ✅ Botão desabilitado (cinza)
- ✅ Tooltip: "Preencha todos os campos"
- ✅ Nada é enviado para API

---

### Teste 7: Case-Insensitive Search

**Após cadastrar "MAXIS":**

1. Abrir modal novamente
2. Digitar: `maxis` (minúsculas)

**Esperado:**
- ✅ Quando buscar por "maxis" na API, encontra "MAXIS"
- ✅ (Esta funcionalidade é no backend, verificável em GET /api/regras-categoria/buscar/maxis)

---

## 🔄 Integração com "Processar Notas"

*(Esta integração ainda está em desenvolvimento)*

**Objetivo:** Quando processar nota fiscal:
1. Extrair fornecedor do XML
2. Buscar regra: `GET /api/regras-categoria/buscar/{fornecedor}`
3. Se encontrar:
   - Pré-preencher `tipo_despesa_id` automaticamente
   - Usuário apenas confirma
4. Se não encontrar:
   - Perguntar qual categoria
   - Opção: "Salvar como regra para próximas"

**Arquivo para modificar:** `backend/routes/api.js` (endpoint `/notas-fiscais/:id/processar`)

---

## 📁 Arquivos Modificados

| Arquivo | Linhas | Modificação |
|---------|--------|-------------|
| `backend/frontend/index.html` | 473-477 | Botão no header de Notas |
| `backend/frontend/index.html` | 1527-1607 | Modal template |
| `backend/frontend/index.html` | 1784-1794 | Data properties |
| `backend/frontend/index.html` | 1808-1819 | Watcher para modal |
| `backend/frontend/index.html` | 3411-3503 | Methods (CRUD) |
| `backend/frontend/js/utils/api.js` | 165-196 | API wrapper functions |
| `backend/routes/api.js` | 2781-2924 | 6 endpoints |
| `backend/models/RegrasCategoriaFornecedor.js` | - | Model (já criado) |

---

## 🚀 Deployment

**Commit:** `f4366a4`

**Status:** ✅ Pushed to Railway

**Próximos Passos:**
1. Aguardar rebuild do Railway (~2-3 min)
2. Testar em: `https://salon-erp.up.railway.app`
3. Seguir guide acima para testes
4. Se tudo OK, integrar com processamento de notas

---

## 🛠️ Troubleshooting

### "Modal não aparece ao clicar botão"
- [ ] Verificar console para erros de JavaScript
- [ ] Confirmar que `mostrarModalRegras` está sendo setado para `true`
- [ ] F5 para hard-refresh

### "Dropdown de categorias vazio"
- [ ] Verificar se `tiposDespesaAgrupados` foi carregado
- [ ] Chamar `carregarTiposDespesa()` no mounted
- [ ] Ver console: `console.log(this.tiposDespesaAgrupados)`

### "Erro ao carregar regras"
- [ ] Se 404: Tabela não existe, system tenta criar (verificar logs)
- [ ] Se 500: Erro no backend, ver logs do servidor
- [ ] Verificar database connection

### "Regras não aparecem após salvar"
- [ ] Verificar response do POST na Network tab
- [ ] Confirmar que `regrasLista` está sendo atualizado
- [ ] Check `await this.carregarRegras()` após salvar

---

## ✅ Checklist de Verificação

- [ ] Modal abre/fecha corretamente
- [ ] Formulário valida campos obrigatórios
- [ ] Cadastrar regra funciona (POST)
- [ ] Listagem atualiza após cadastro
- [ ] Editar regra funciona (PUT)
- [ ] Deletar regra funciona com confirmação (DELETE)
- [ ] Mensagens de sucesso/erro aparecem
- [ ] Dropdown de categorias mostra todas as opções
- [ ] Sem erros de JavaScript no console
- [ ] Loading states funcionam (botões desabilitados)
- [ ] Auto-inicializa tabela se não existe
- [ ] Modal limpa ao fechar

---

**Status:** ✅ PRONTO PARA TESTAR

**Tempo Implementação:** ~3 horas (backend model + endpoints + frontend interface)

**Próxima Fase:** Integração com processamento de notas para auto-categorização
