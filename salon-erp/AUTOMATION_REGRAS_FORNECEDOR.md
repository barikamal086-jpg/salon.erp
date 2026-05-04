# AUTOMAÇÃO: Categorização Automática por Fornecedor

**Data:** 2026-05-02 | **Status:** ✅ Implementado | **Commit:** `f53d81b`

---

## 📋 O Problema

Cada vez que processa uma nota fiscal, você precisa:
1. Selecionar manualmente a categoria (tipo_despesa)
2. Confirmar a data de vencimento
3. Salvar

**Se você recebe 20 notas do mesmo fornecedor, repete isso 20x.**

---

## ✅ A Solução

**Criar regras fixas: FORNECEDOR → CATEGORIA**

Depois de cadastrar a regra UMA VEZ:
- Sistema detecta o fornecedor automaticamente
- Sistema já sugere a categoria
- Você apenas confirma (ou muda se necessário)

---

## 🚀 COMO USAR

### 1️⃣ Inicializar a Tabela

No console do navegador (F12 → Console), cole:

```javascript
fetch('/api/debug/init-regras', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log('✅ Tabela criada:', d))
```

---

### 2️⃣ Cadastrar Regra

**Opção A: Pelo Console**

```javascript
fetch('/api/regras-categoria', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fornecedor_nome: 'INDUSTRIA DE ALIMENTOS URI OMMA KIMCHI LTDA',
    tipo_despesa_id: 5  // ID da categoria (ex: Alimentos)
  })
})
  .then(r => r.json())
  .then(d => console.log('✅ Regra cadastrada:', d))
```

**Opção B: Via curl**

```bash
curl -X POST https://seu-dominio/api/regras-categoria \
  -H "Content-Type: application/json" \
  -d '{
    "fornecedor_nome": "INDUSTRIA DE ALIMENTOS URI OMMA KIMCHI LTDA",
    "tipo_despesa_id": 5
  }'
```

---

### 3️⃣ Listar Todas as Regras

```javascript
fetch('/api/regras-categoria')
  .then(r => r.json())
  .then(d => {
    console.log('📋 Total de regras:', d.quantidade);
    d.regras.forEach(r => {
      console.log(`${r.fornecedor_nome} → ${r.subcategoria}`);
    });
  })
```

---

### 4️⃣ Buscar Regra por Fornecedor

```javascript
fetch('/api/regras-categoria/buscar/KIMCHI')
  .then(r => r.json())
  .then(d => {
    if (d.success) {
      console.log('✅ Regra encontrada:', d.regra);
    } else {
      console.log('❌ Nenhuma regra para este fornecedor');
    }
  })
```

**Resposta:**
```json
{
  "success": true,
  "regra": {
    "id": 1,
    "fornecedor_nome": "INDUSTRIA DE ALIMENTOS URI OMMA KIMCHI LTDA",
    "tipo_despesa_id": 5,
    "subcategoria": "Alimentos",
    "classificacao": "CMV",
    "ativo": true
  }
}
```

---

### 5️⃣ Atualizar Regra

```javascript
fetch('/api/regras-categoria/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tipo_despesa_id: 7  // Novo ID da categoria
  })
})
  .then(r => r.json())
  .then(d => console.log('✅ Regra atualizada:', d))
```

---

### 6️⃣ Deletar Regra

```javascript
fetch('/api/regras-categoria/1', {
  method: 'DELETE'
})
  .then(r => r.json())
  .then(d => console.log('✅ Regra deletada:', d))
```

---

## 🔄 COMO INTEGRAR COM PROCESSAMENTO DE NOTAS

*(Próxima fase - ainda não implementado)*

Ao processar nota fiscal:

```
1. Extrair fornecedor do XML
2. Buscar regra: GET /api/regras-categoria/buscar/{fornecedor}
3. Se encontrar:
   - Pré-preencher tipo_despesa_id automaticamente
   - Usuário apenas confirma
4. Se não encontrar:
   - Perguntar qual categoria
   - Opção: "Salvar como regra para próximas"
```

---

## 📊 Schema da Tabela

```sql
CREATE TABLE regras_categoria_fornecedor (
  id SERIAL PRIMARY KEY,
  fornecedor_nome VARCHAR(255) UNIQUE NOT NULL,  -- Nome exato do fornecedor
  tipo_despesa_id INTEGER NOT NULL REFERENCES tipo_despesa(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_regra_fornecedor 
ON regras_categoria_fornecedor(LOWER(fornecedor_nome));
```

---

## 💡 BOAS PRÁTICAS

### 1. Nome do Fornecedor
- Use o **nome EXATO** do XML (case-insensitive na busca)
- Exemplos:
  - ✅ `INDUSTRIA DE ALIMENTOS URI OMMA KIMCHI LTDA`
  - ✅ `PADARIA SAO JOAO`
  - ✅ `DISTRIBUIDORA ABC EIRELI`

### 2. Encontrar o tipo_despesa_id
```javascript
// Listar todas as categorias disponíveis
fetch('/api/tipo-despesa/agrupado')
  .then(r => r.json())
  .then(d => {
    Object.entries(d.data).forEach(([classificacao, subcats]) => {
      subcats.forEach(s => {
        console.log(`${s.id} - ${s.subcategoria} (${classificacao})`);
      });
    });
  })
```

### 3. Regras Padrão Recomendadas
```javascript
// Exemplos de regras úteis
const regrasRecomendadas = [
  { fornecedor: "PADARIA SAO JOAO", categoria_id: 2 },        // CMV
  { fornecedor: "DISTRIBUIDORA ABC", categoria_id: 3 },       // CMV
  { fornecedor: "IPHONE LTDA", categoria_id: 15 },            // Operacional
  { fornecedor: "ENERGIA ELETROPAULO", categoria_id: 18 },    // Utilidade
];
```

---

## 🧪 TESTES DE VERIFICAÇÃO

### Teste 1: Criar Tabela
```javascript
fetch('/api/debug/init-regras', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log(d.success ? '✅ OK' : '❌ ERRO'))
```
**Esperado:** `✅ OK`

### Teste 2: Cadastrar Regra
```javascript
fetch('/api/regras-categoria', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fornecedor_nome: 'TESTE FORNECEDOR XYZ',
    tipo_despesa_id: 5
  })
})
  .then(r => r.json())
  .then(d => console.log(d.success ? '✅ OK' : '❌ ERRO'))
```
**Esperado:** `✅ OK`, com regra retornada

### Teste 3: Listar Regras
```javascript
fetch('/api/regras-categoria')
  .then(r => r.json())
  .then(d => console.log('Total:', d.quantidade))
```
**Esperado:** Número > 0

### Teste 4: Buscar Regra
```javascript
fetch('/api/regras-categoria/buscar/TESTE%20FORNECEDOR')
  .then(r => r.json())
  .then(d => console.log(d.regra ? '✅ Encontrada' : '❌ Não encontrada'))
```
**Esperado:** `✅ Encontrada`

### Teste 5: Case-Insensitive
```javascript
fetch('/api/regras-categoria/buscar/teste%20fornecedor%20xyz')
  .then(r => r.json())
  .then(d => console.log(d.success ? '✅ Case-insensitive OK' : '❌ ERRO'))
```
**Esperado:** `✅ Case-insensitive OK` (funciona com qualquer case)

---

## 🐛 TROUBLESHOOTING

### "Nenhuma regra cadastrada"
→ Use `GET /api/regras-categoria` para verificar se há regras
→ Se vazio, crie as regras com `POST /api/regras-categoria`

### "Fornecedor não encontrado"
→ Verifique o nome EXATO do fornecedor no XML
→ Use `GET /api/regras-categoria` para listar e comparar

### Erro 400 ao cadastrar
→ Verifique se `tipo_despesa_id` existe
→ Use `/api/tipo-despesa/agrupado` para validar IDs

### "Table not found" error
→ Execute `POST /api/debug/init-regras` para criar tabela

---

## 📝 PRÓXIMOS PASSOS

1. **Interface no Frontend** - Tela para gerenciar regras (CRUD visual)
2. **Integração com Upload** - Auto-sugerir categoria ao processar nota
3. **Histórico** - Log de qual regra foi usada para qual nota
4. **Sincronização** - Sincronizar regras entre filiais

---

## REFERÊNCIA RÁPIDA

| Ação | Método | Endpoint |
|------|--------|----------|
| Criar tabela | POST | `/api/debug/init-regras` |
| Cadastrar regra | POST | `/api/regras-categoria` |
| Listar regras | GET | `/api/regras-categoria` |
| Buscar por fornecedor | GET | `/api/regras-categoria/buscar/{fornecedor}` |
| Atualizar regra | PUT | `/api/regras-categoria/{id}` |
| Deletar regra | DELETE | `/api/regras-categoria/{id}` |

---

**Status:** ✅ Pronto para usar
**Commit:** `f53d81b`
**Data:** 2026-05-02
