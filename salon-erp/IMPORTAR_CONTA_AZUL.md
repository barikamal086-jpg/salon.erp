# 📊 Importação do Conta Azul

## Como usar

### **Opção 1: Via CLI (Recomendado para testes)**

```bash
cd backend

# Para servidor local (localhost:5006)
node importar-conta-azul-cli.js ./seu-arquivo.xlsx

# Para servidor Railway
node importar-conta-azul-cli.js ./seu-arquivo.xlsx https://caixa360.up.railway.app/api
```

### **Opção 2: Via cURL**

```bash
curl -X POST \
  -F "arquivo=@seu-arquivo.xlsx" \
  http://localhost:5006/api/importar-conta-azul

# Para Railway:
curl -X POST \
  -F "arquivo=@seu-arquivo.xlsx" \
  https://caixa360.up.railway.app/api/importar-conta-azul
```

### **Opção 3: Via JavaScript (no console do navegador)**

```javascript
// 1. Selecione um arquivo Excel
const arquivo = document.querySelector('input[type="file"]').files[0];

// 2. Envie para a API
const formData = new FormData();
formData.append('arquivo', arquivo);

fetch('https://caixa360.up.railway.app/api/importar-conta-azul', {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(d => {
  console.log('✅ Importação concluída!');
  console.log('Importados:', d.dados.importados);
  console.log('Duplicados:', d.dados.duplicados);
  console.log('Erros:', d.dados.erros);
  console.log('Detalhes:', d.dados.detalhes);
})
.catch(err => console.error('❌ Erro:', err))
```

---

## Formato do Excel Esperado

As colunas devem ser:

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| **Data de competência** | Data do lançamento | 01/04/2026 |
| **Descrição** | Descrição do gasto/receita | Aluguel abril |
| **Nome do fornecedor/cliente** | Quem recebeu/pagou | Proprietário do imóvel |
| **Valor (R$)** | Valor (negativo = despesa) | -2500 ou 5000 |
| **Categoria 1** | Categoria Conta Azul | Aluguel |
| **Identificador** | ID único (evita duplicatas) | CA-2026-001 (opcional) |

---

## Mapeamento de Categorias

O sistema mapeia automaticamente:

### **CMV (Produto)**
- Hortifruti → CMV/Hortifruti
- Bebidas → CMV/Bebidas (canal: Salão)
- Carne → CMV/Carne
- Padaria → CMV/Padaria
- Óleo → CMV/Óleo
- Embalagem → CMV/Embalagem
- Descartáveis → CMV/Embalagem
- Gelo → CMV/Bebidas
- Laticínios → CMV/Hortifruti

### **Operacional**
- Aluguel → Operacional/Aluguel
- Água e Saneamento → Operacional/Utilidades
- Energia Elétrica → Operacional/Utilidades
- Gás → Operacional/Utilidades
- Freelancer → Operacional/Pessoal

### **Administrativa**
- Salário → Administrativa/Pessoal
- Impostos → Administrativa/Impostos
- IPTU → Administrativa/Impostos
- Prolabore → Administrativa/Pessoal
- Dividendos → Administrativa/Pessoal

### **Financeira (Taxas de plataforma)**
- Taxas iFood → Financeira/Taxas (canal: iFood)
- Taxa 99Food → Financeira/Taxas (canal: 99Food)
- Keeta Food → Financeira/Taxas (canal: Keeta)

---

## Resposta da API

```json
{
  "success": true,
  "message": "50 lançamento(s) importado(s), 2 duplicado(s), 1 erro(s)",
  "dados": {
    "importados": 50,
    "duplicados": 2,
    "erros": 1,
    "detalhes": {
      "importados": [
        {
          "id": 123,
          "data": "2026-04-01",
          "descricao": "Aluguel",
          "fornecedor": "Proprietário",
          "valor": 2500,
          "tipo": "despesa",
          "categoria": "Salão",
          "classificacao": "Operacional"
        }
      ],
      "duplicados": [
        {
          "linha": 5,
          "descricao": "Energia",
          "identificador": "CA-2026-005"
        }
      ],
      "erros": [
        {
          "linha": 10,
          "erro": "Data inválida"
        }
      ]
    }
  }
}
```

---

## Regras de Importação

1. **Valor negativo** = Despesa
2. **Valor positivo** = Receita
3. **Categoria padrão para sem canal** = Salão
4. **Duplicata detectada por** = Campo "Identificador" ou combinação Data + Descrição + Valor
5. **Data no formato** = DD/MM/YYYY, DD-MM-YYYY, ou serial Excel
6. **Categoria não mapeada** = Operacional/Diversos (padrão)

---

## Exemplos de Uso

### Importar Conta Azul local
```bash
node importar-conta-azul-cli.js ./Downloads/conta-azul-abril.xlsx
```

### Importar para Railway
```bash
node importar-conta-azul-cli.js ./Downloads/conta-azul-abril.xlsx https://caixa360.up.railway.app/api
```

### Verificar resultado
A resposta mostra:
- ✅ Quantos foram importados
- ⚠️ Quantos eram duplicados
- ❌ Quantos tiveram erro

---

## Troubleshooting

### "API não está respondendo"
- Verifique se o servidor está rodando (`npm start`)
- Para Railway, aguarde o deploy finalizar

### "Arquivo não encontrado"
- Use caminho relativo ou absoluto correto
- Exemplo: `./arquivo.xlsx` ou `C:\Users\seu-usuario\Downloads\arquivo.xlsx`

### "Data inválida"
- Use formato DD/MM/YYYY ou DD-MM-YYYY
- Ou deixe em branco para data de hoje

### Muitos duplicados
- Adicione coluna "Identificador" com IDs únicos
- Ou delete os antigos antes de reimportar

---

## Próximos passos

Depois de importar:
1. Verifique o dashboard
2. Veja os faturamentos importados em "Histórico"
3. Valide as classificações automáticas
4. Ajuste as regras de mapeamento se necessário
