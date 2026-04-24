# Alocação Proporcional de CMV por Canal

## Conceito

O CMV (Custo de Mercadoria Vendida) é alocado **proporcionalmente à receita gerada por cada canal**.

Se um canal gerou 40% da receita total, receberá 40% do CMV total.

## Fórmula

```
CMV_Canal = CMV_Total × (Receita_Canal / Receita_Total)
```

## Exemplo Prático

**Período: 01/04/2026 a 20/04/2026**

### Receita Total: R$ 300.000

| Canal | Receita | % do Total |
|-------|---------|-----------|
| 🍽️ Salão | R$ 100.000 | 33,3% |
| 🍔 iFood | R$ 120.000 | **40,0%** |
| 🥘 Keeta | R$ 50.000 | 16,7% |
| 🚗 99Food | R$ 30.000 | 10,0% |
| **TOTAL** | **R$ 300.000** | **100%** |

### CMV Total: R$ 60.000

| Subcategoria | CMV |
|--------------|-----|
| 🥩 Carnes | R$ 30.000 |
| 🍷 Bebidas | R$ 15.000 |
| 📦 Embalagem | R$ 10.000 |
| 🥬 Hortifruti | R$ 5.000 |
| **TOTAL** | **R$ 60.000** |

### Quando Usuário Seleciona: 🍔 iFood (40% da receita)

**CMV Alocado para iFood:**
```
R$ 60.000 × 40% = R$ 24.000
```

**Breakdown por Subcategoria:**
| Subcategoria | CMV Total | % Receita iFood | CMV iFood |
|--------------|-----------|-----------------|-----------|
| 🥩 Carnes | R$ 30.000 | 40% | R$ 12.000 |
| 🍷 Bebidas | R$ 15.000 | 40% | R$ 6.000 |
| 📦 Embalagem | R$ 10.000 | 40% | R$ 4.000 |
| 🥬 Hortifruti | R$ 5.000 | 40% | R$ 2.000 |
| **TOTAL** | **R$ 60.000** | **40%** | **R$ 24.000** |

### CMV % para iFood

```
CMV % = CMV_iFood / Receita_iFood
CMV % = 24.000 / 120.000 = 20%
```

---

## Implementação Técnica

### Quando Usuário Seleciona um Canal

1. **Calcular Receita Total** do período (todas categorias)
2. **Calcular Receita do Canal** selecionado
3. **Calcular Percentual**: `receita_canal / receita_total`
4. **Alocar CMV**: `cmv_total × percentual`
5. **Alocar Subcategorias**: cada subcategoria × percentual

### Código (Faturamento.js)

```javascript
// Exemplo: obterTotalCMV(dataInicio, dataFim, 'iFood')

// 1. Receita total período
totalReceita = 300.000

// 2. Receita iFood
receitaiFood = 120.000

// 3. Percentual
percentual = 120.000 / 300.000 = 0.4 (40%)

// 4. CMV alocado
cmvAlocado = 60.000 × 0.4 = 24.000
```

---

## Quando Usar Qual Opção

### ✨ Todos (Consolidado)
- Mostra CMV total sem filtragem
- Não há alocação (100% do CMV)

### 🍽️ Salão / 🍔 iFood / 🥘 Keeta / 🚗 99Food
- Mostra CMV alocado proporcionalmente pela receita daquele canal
- CMV % reflete o custo real daquele canal

---

## Benefícios

✅ **Análise realista** - Cada canal vê seu CMV proporcional  
✅ **Sem duplicação** - CMV total sempre é o mesmo  
✅ **Automático** - Não precisa entrada manual  
✅ **Dinâmico** - Recalcula ao mudar período ou canal

---

## Próximas Melhorias (Fase 2+)

1. **Alocar por Fornecedor** - Alguns fornecedores são específicos de canais
2. **Alocar por Produto** - Alguns produtos só vendem em iFood
3. **Entrada Manual** - Interface para ajustar alocação se necessário
4. **Histórico de Alocação** - Rastrear como CMV foi alocado
