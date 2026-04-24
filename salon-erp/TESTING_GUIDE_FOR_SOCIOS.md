# 🧪 Guia de Testes para Younes, Bruno e Kamal

**Status:** Pronto para testes da Fase 1 (Validação Multi-Restaurante)  
**Data:** 2026-04-24  
**Versão:** v1.0.0

---

## 🚀 Como Começar

### Opção 1: Testar Localmente (recomendado para debug)
```bash
cd salon-erp/backend
npm start
# Abre: http://localhost:5006
```

### Opção 2: Testar na Nuvem (Railway)
```
Abra seu navegador em: https://[seu-railway-url].railway.app
(URL será fornecida quando Railway deploy estiver pronto)
```

---

## 🎯 Fase 1: Teste do Seletor Multi-Restaurante

### O que Temos Agora?

KAIA agora suporta 4 canais de receita operando como "restaurantes":

```
🏪 KAIA - Salão (Verde)
   └─ Vendas presenciais no estabelecimento
   └─ Maior margem, sem taxas de plataforma

🍕 KAIA - iFood (Vermelho)  
   └─ Pedidos via plataforma iFood
   └- Menor margem, com taxas de delivery

📱 KAIA - Keeta (Amarelo/Teal)
   └─ Pedidos via plataforma Keeta
   └─ Menor margem, com taxas de delivery

🟨 KAIA - 99Food (Amarelo)
   └─ Pedidos via plataforma 99Food
   └─ Menor margem, com taxas de delivery
```

---

## 📝 Checklist de Testes (Para Cada Sócio)

### 1. Verificar Botões de Seleção
**O que fazer:**
1. Abra a app
2. Navegue até "CMV Inteligente"
3. Procure por 5 botões coloridos no topo:

```
[Consolidado] [Salão] [iFood] [Keeta] [99Food]
   (azul)    (verde) (verm) (amar)  (amar2)
```

**✅ Sucesso:** Todos os 5 botões aparecem com cores distintas

---

### 2. Testar Seleção de Consolidado
**O que fazer:**
1. Clique no botão **"Consolidado"** (azul)
2. Observe os dados carregarem
3. Anote os valores:
   - Receita Total
   - CMV %
   - Margem Bruta %

**Esperado:**
- Receita = Soma de (Salão + iFood + Keeta + 99Food)
- CMV % = (CMV Total / Receita Líquida) × 100
- Margem = (Receita - CMV) / Receita × 100

**✅ Sucesso:** Valores aparecem e são > 0

---

### 3. Testar Seleção do Salão (Verde)
**O que fazer:**
1. Clique no botão **"Salão"** (verde)
2. Observe os dados mudarem
3. Anote os valores

**Esperado:**
- CMV % do Salão deve ser **maior** que do iFood
  - Motivo: Salão tem custos físicos (aluguel, funcionários, etc)
- Margem do Salão deve ser **menor** que do iFood
  - Motivo: Salão é canal com mais despesas

**Younes** (responsável por Salão):
- Este é seu canal principal
- CMV % típico: 20-25%
- Verifique se os números batem com seus registros

**✅ Sucesso:** Dados aparecem e diferem de "Consolidado"

---

### 4. Testar Seleção do iFood (Vermelho)
**O que fazer:**
1. Clique no botão **"iFood"** (vermelho)
2. Observe os dados mudarem
3. Compare com Salão

**Esperado:**
- CMV % do iFood deve ser **menor** que do Salão
  - Motivo: iFood opera sem custos fixos, receita é só delivery
- Margem do iFood deve ser **maior** que do Salão
  - Motivo: Menos custos operacionais

**Bruno** (pode monitorar iFood):
- Observe o volume de pedidos
- Verifique a receita líquida (depois das taxas)
- CMV % típico: 13-18%

**✅ Sucesso:** CMV % menor que Salão, Margem maior que Salão

---

### 5. Testar Seleção do Keeta (Amarelo/Teal)
**O que fazer:**
1. Clique no botão **"Keeta"** (amarelo/teal)
2. Observe os dados

**Esperado:**
- Similar ao iFood (é delivery também)
- CMV % entre 15-20%

**Kamal** (pode monitorar Keeta):
- Verifique o volume de pedidos
- Compare com 99Food
- CMV % típico: 15-20%

**✅ Sucesso:** Dados aparecem com valores consistentes

---

### 6. Testar Seleção do 99Food (Amarelo)
**O que fazer:**
1. Clique no botão **"99Food"** (amarelo)
2. Observe os dados

**Esperado:**
- Similar ao Keeta (é delivery também)
- CMV % entre 15-20%

**Kamal** (pode monitorar 99Food):
- Verifique o volume de pedidos
- Compare com Keeta
- CMV % típico: 15-20%

**✅ Sucesso:** Dados aparecem com valores consistentes

---

### 7. Testar Mudanças de Período

**O que fazer:**
1. Selecione "Consolidado"
2. Escolha um período: por exemplo "01/04/2026 a 30/04/2026"
3. Anote os valores
4. Mude para "01/03/2026 a 31/03/2026"
5. Observe os dados mudarem

**✅ Sucesso:** 
- Mudança de período afeta todos os canais
- Valores mudam para cada período

---

## 🔍 Validação de Cálculos

### CMV % Deve Seguir Esta Fórmula:
```
CMV % = (CMV Total / Receita Líquida) × 100

Onde:
  CMV = Custo de Mercadoria Vendida
  Receita Líquida = Receita - Taxas de Plataforma
```

### Exemplo (iFood):
```
Receita Bruta: R$ 1.000
Taxas iFood: R$ 100 (10%)
Receita Líquida: R$ 900
CMV: R$ 117
CMV % = (117 / 900) × 100 = 13%  ✅
```

### Exemplo (Salão):
```
Receita: R$ 1.000 (sem taxas)
Despesas Alocadas: R$ 250 (aluguel, funcionários)
CMV: R$ 250
CMV % = (250 / 1.000) × 100 = 25%  ✅
```

---

## 📊 O Que Diferencia Cada Canal?

| Aspecto | Salão | iFood | Keeta | 99Food |
|---------|-------|-------|-------|--------|
| **Tipo** | Presencial | Delivery | Delivery | Delivery |
| **Taxas** | Nenhuma | ~10% | ~10% | ~10% |
| **Custos Fixos** | Altos | Baixos | Baixos | Baixos |
| **CMV % Típico** | 20-25% | 13-18% | 15-20% | 15-20% |
| **Margem Típica** | 60-75% | 75-85% | 75-85% | 75-85% |
| **Responsável** | Younes | Bruno | Kamal | Kamal |

---

## 🐛 Se Algo Não Funcionar

### Sintoma: Botões não aparecem
- [ ] Recarregue a página (Ctrl+F5)
- [ ] Verifique se está em "CMV Inteligente" section
- [ ] Abra console (F12) e procure por erros

### Sintoma: Dados não carregam quando clica em botão
- [ ] Espere 2-3 segundos
- [ ] Verifique internet (testando outro site)
- [ ] Verifique console de erro (F12)
- [ ] Recarregue a página

### Sintoma: CMV % igual para todos os canais
- [ ] Pode significar que não há dados suficientes para cada canal
- [ ] Adicione receitas de teste para cada canal
- [ ] Espere um pouco (cache pode estar velho)

### Sintoma: Números muito diferentes do esperado
- [ ] Verifique que está usando o período correto
- [ ] Confirme que os dados de entrada estão corretos
- [ ] Cheque se as despesas foram alocadas corretamente

---

## 📋 Relatório de Testes

**Para Younes, Bruno e Kamal:**

Depois de testar, preencha este pequeno relatório:

```
Data do Teste: _______________
Ambiente: [ ] Local   [ ] Railway
Testador: [ ] Younes  [ ] Bruno  [ ] Kamal

FASE 1 - SELETOR MULTI-RESTAURANTE
[ ] Botões aparecem corretamente
[ ] Consolidado carrega dados
[ ] Salão carrega dados diferentes
[ ] iFood carrega dados diferentes
[ ] Keeta carrega dados
[ ] 99Food carrega dados
[ ] Mudança de período funciona

VALIDAÇÃO DE DADOS
[ ] CMV % Salão (20-25%): ______%
[ ] CMV % iFood (13-18%): ______%
[ ] CMV % Keeta (15-20%): ______%
[ ] CMV % 99Food (15-20%): ______%

OBSERVAÇÕES:
_________________________________
_________________________________
_________________________________

PROBLEMAS ENCONTRADOS:
[ ] Nenhum
[ ] Sim (descrever):
_________________________________
_________________________________
```

---

## ✅ O Que Significa "Pronto para Fase 2"?

Depois que Fase 1 estiver 100% validada:

### Próximo: Fase 2 - Multi-Tenant (Cada Cliente Isolado)
```
Atual (Fase 1):
  KAIA (1 cliente)
  └─ 4 Canais (Salão, iFood, Keeta, 99Food)

Futuro (Fase 2):
  KAIA (cliente 1)
  ├─ 4 Canais próprios
  └─ Dados completamente isolados
  
  Pizzaria Roma (cliente 2)
  ├─ Seus próprios canais
  └─ Dados completamente isolados
  
  Outro Restaurante (cliente 3)
  └─ Mesmo isolamento
```

Com Fase 2, cada restaurante pode usar a plataforma independentemente.

---

## 🎓 Resumo Para Cada Sócio

### Younes
- Você monitora **Salão** principalmente
- Busque CMV % entre 20-25%
- Compare com histórico anterior
- Verifique se despesas fixas estão incluídas

### Bruno
- Você pode focar em **iFood**
- Busque CMV % entre 13-18%
- Verifique margem bruta após taxas
- Compare com presencial (deve ser melhor)

### Kamal
- Você pode focar em **Keeta + 99Food**
- Busque CMV % entre 15-20% cada
- Compare os dois canais entre si
- Veja qual tem melhor desempenho

---

## 🚀 Próximos Passos

1. ✅ **Cada sócio testa seu canal** (Fase 1)
2. 📝 **Preenchem relatório de teste**
3. 💬 **Debrief juntos** - O que funcionou? O que ajustar?
4. 🚀 **Deploy em Railway** - App na nuvem
5. 📊 **Fase 2** - Multi-tenant para escalabilidade

---

**Perguntas?** Verifique:
- PHASE1_STATUS.md - Status técnico detalhado
- RAILWAY_DEPLOYMENT_GUIDE.md - Guia de deployment
- API_CMV_V2_DOCUMENTACAO.md - Documentação de CMV

**Sucesso nos testes!** 🎉

---

**Última atualização:** 2026-04-24  
**Preparado por:** Claude  
**Para:** Younes, Bruno, Kamal (KAIA Team)
