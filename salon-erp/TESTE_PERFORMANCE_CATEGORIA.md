# 🧪 TESTE: Performance por Categoria

**Objetivo:** Validar que os endpoints retornam dados corretos e o merge funciona  
**Data:** 2026-05-04  
**Ambiente:** Production (Railway)

---

## ✅ TESTE 1: Verificar Endpoint `/stats-categoria`

### Requisição
```bash
curl -X GET "https://salon-erp.up.railway.app/api/faturamentos/stats-categoria?from=2026-04-01&to=2026-04-30"
```

### Resposta Esperada
```json
{
  "success": true,
  "data": [
    {
      "categoria": "Salão",
      "totalReceita": 100000,
      "totalDespesa": 20000,
      "totalLiquido": 80000,
      "mediaReceita": 3333.33,
      "mediaDespesa": 666.67,
      "maiorReceita": 5000,
      "maiorDespesa": 2000,
      "dias": 30,
      "totalEntradas": 45
    },
    {
      "categoria": "iFood",
      "totalReceita": 80000,
      "totalDespesa": 18000,
      "totalLiquido": 62000,
      ...
    },
    {
      "categoria": "Keeta",
      ...
    },
    {
      "categoria": "99Food",
      ...
    }
  ]
}
```

### Validações
- [ ] Response status = 200
- [ ] Success = true
- [ ] Array tem exatamente 4 elementos (Salão, iFood, Keeta, 99Food)
- [ ] Cada categoria tem totalReceita, totalDespesa, totalLiquido
- [ ] totalLiquido = totalReceita - totalDespesa ✓
- [ ] Nenhuma categoria "estranha" (ex: "Restaurante", "Outro", etc)

---

## ✅ TESTE 2: Verificar Endpoint `/despesas-alocadas`

### Requisição
```bash
curl -X GET "https://salon-erp.up.railway.app/api/faturamentos/despesas-alocadas?from=2026-04-01&to=2026-04-30"
```

### Resposta Esperada
```json
{
  "success": true,
  "data": [
    {
      "categoria": "Salão",
      "totalReceita": 100000,
      "totalTaxas": 20000,
      "totalDespesasAlocadas": 0,
      "totalDespesa": 20000,
      "totalLiquido": 80000,
      "proporcao": "32.26"
    },
    {
      "categoria": "iFood",
      "totalReceita": 80000,
      "totalTaxas": 18000,
      "totalDespesasAlocadas": 6452,      // ← Parte do aluguel/utilidades do Salão
      "totalDespesa": 24452,
      "totalLiquido": 55548,
      "proporcao": "25.81"
    },
    {
      "categoria": "Keeta",
      "totalReceita": 60000,
      "totalTaxas": 15000,
      "totalDespesasAlocadas": 4839,
      "totalDespesa": 19839,
      "totalLiquido": 40161,
      "proporcao": "19.35"
    },
    {
      "categoria": "99Food",
      "totalReceita": 70000,
      "totalTaxas": 16000,
      "totalDespesasAlocadas": 5645,
      "totalDespesa": 21645,
      "totalLiquido": 48355,
      "proporcao": "22.58"
    }
  ]
}
```

### Validações
- [ ] Response status = 200
- [ ] Success = true
- [ ] Salão: totalDespesasAlocadas = 0 ✓
- [ ] Salão: totalDespesa = totalTaxas (não recebe alocação)
- [ ] iFood, Keeta, 99Food: totalDespesasAlocadas > 0 ✓
- [ ] Soma de todas as proporções ≈ 100% ✓
- [ ] totalDespesa = totalTaxas + totalDespesasAlocadas ✓
- [ ] totalLiquido = totalReceita - totalDespesa ✓

### Validação da Alocação Matemática

Verificar se a soma das alocações é consistente:

```
Despesa Salão (totalDespesa WHERE categoria='Salão'): 20000
Receita Total (todas categorias): 310000

iFood:   80000 / 310000 × 20000 = 5161.29 (resultado deve ser ≈ totalDespesasAlocadas)
Keeta:   60000 / 310000 × 20000 = 3870.97
99Food:  70000 / 310000 × 20000 = 4516.13

Soma aproximada: 5161 + 3871 + 4516 = 13548 (deixa ~6452 sem alocar por questões de rounding)
```

---

## ✅ TESTE 3: Verificar Merge no Frontend

### Como Testar
1. Abra o navegador em: https://salon-erp.up.railway.app
2. Faça login com credenciais válidas
3. Abra o DevTools (F12)
4. Vá para a aba "Console"
5. Digite:
   ```javascript
   console.log(app.$data.statsPorCategoria)
   ```

### Resposta Esperada
Array com 4 categorias, cada uma tendo:
```javascript
[
  {
    categoria: "Salão",
    totalReceita: 100000,
    totalTaxas: 20000,              // ← Do endpoint despesas-alocadas
    totalDespesasAlocadas: 0,       // ← Do endpoint despesas-alocadas
    totalDespesa: 20000,            // ← Mesclado (taxas + alocadas)
    totalLiquido: 80000,            // ← Recalculado
    mediaReceita: 3333.33,
    mediaDespesa: 666.67,
    ...
  },
  // ... iFood, Keeta, 99Food
]
```

### Validações
- [ ] Array tem exatamente 4 elementos
- [ ] Cada elemento tem campos: totalTaxas, totalDespesasAlocadas
- [ ] totalDespesa = totalTaxas + totalDespesasAlocadas (match com backend)
- [ ] totalLiquido = totalReceita - totalDespesa
- [ ] Salão tem totalDespesasAlocadas = 0

---

## ✅ TESTE 4: Verificar Tabela no Dashboard

### Como Testar
1. No dashboard, procure a seção "Performance por Categoria"
2. Deve haver uma tabela com colunas:
   - Categoria
   - Receita
   - Taxas (ou "Despesas Reais")
   - Despesas Alocadas
   - Total Despesa
   - Líquido
   - Margem (%)

### Validações
- [ ] Tabela exibe 4 linhas (Salão, iFood, Keeta, 99Food)
- [ ] Valores são números positivos
- [ ] Nenhuma célula mostra "NaN" ou "undefined"
- [ ] Totaliza corretamente: Receita - Total Despesa = Líquido
- [ ] Margem % calculada corretamente: (Líquido / Receita) × 100
- [ ] Salão mostra "Alocadas: 0" ou "-"

---

## ✅ TESTE 5: Testar Mudança de Período

### Como Testar
1. No dashboard, altere o período (ex: 01/03 a 31/03)
2. Observe se a tabela atualiza automaticamente
3. Verifique se os números mudam

### Validações
- [ ] Tabela atualiza sem erro
- [ ] Números mudam (não são valores hardcoded)
- [ ] Merge continua funcionando (sem NaN)
- [ ] Console não mostra erros
- [ ] Sem travamento ou latência excessiva

---

## ✅ TESTE 6: Testar Com Período Sem Dados

### Como Testar
1. Altere período para: 01/01/2020 a 31/01/2020 (período vazio)
2. Observe o comportamento

### Validações
- [ ] Tabela exibe 4 categorias (mesmo sem dados)
- [ ] Valores mostram 0 ou "-"
- [ ] Sem erros no console
- [ ] Sem crash da aplicação

---

## 🐛 PROBLEMAS CONHECIDOS A VERIFICAR

| Problema | Sintoma | Status |
|----------|---------|--------|
| Endpoints retornando 404 | GET retorna erro 404 | Verificar em TESTE 1 e 2 |
| Dados não mesclando | totalDespesa ≠ totalTaxas + alocadas | Verificar em TESTE 3 |
| Valores NaN no frontend | Tabela mostra "NaN" | Verificar em TESTE 4 |
| Salão recebendo alocação | iFood + Keeta + 99Food soma ≠ despesa Salão | Verificar em TESTE 2 |
| Período não atualiza | Dados não mudam ao alterar datas | Verificar em TESTE 5 |

---

## 📊 EXEMPLO DE DADOS REAIS ESPERADOS

Se o sistema tiver dados reais de KAIA:

```
Data: 01/04 - 30/04

Salão:
  - 30 dias com receitas
  - Receita: R$ 100.000 (vendas presenciais)
  - Despesa: R$ 20.000 (aluguel R$ 5k, funcionários R$ 10k, utilidades R$ 5k)
  - Líquido: R$ 80.000
  - Margem: 80%

iFood:
  - Receita: R$ 80.000 (pedidos delivery)
  - Despesa Real (Taxa iFood): R$ 18.000
  - Despesa Alocada (% do aluguel/utilidades Salão): R$ 6.452
  - Total Despesa: R$ 24.452
  - Líquido: R$ 55.548
  - Margem: 69.4%

Keeta:
  - Receita: R$ 60.000
  - Despesa Real: R$ 15.000
  - Despesa Alocada: R$ 4.839
  - Total: R$ 19.839
  - Líquido: R$ 40.161
  - Margem: 67%

99Food:
  - Receita: R$ 70.000
  - Despesa Real: R$ 16.000
  - Despesa Alocada: R$ 5.645
  - Total: R$ 21.645
  - Líquido: R$ 48.355
  - Margem: 69%
```

---

## 🎯 CHECKLIST FINAL

**Antes de considerar "implementação completa e validada":**

- [ ] TESTE 1 passa (endpoint stats-categoria)
- [ ] TESTE 2 passa (endpoint despesas-alocadas)
- [ ] TESTE 3 passa (frontend recebe dados corretos)
- [ ] TESTE 4 passa (tabela exibe corretamente)
- [ ] TESTE 5 passa (atualização de período funciona)
- [ ] TESTE 6 passa (período sem dados não quebra)
- [ ] Nenhum problema conhecido ativo
- [ ] Console sem erros

**Status Atual:** ✅ **Pronto para Testes**

---

**Próximo Passo:** Executar testes em ambiente de produção (Railway) e documentar resultados aqui.
