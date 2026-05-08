# 🎨 Guia Visual: Como Identificar a Discrepância

**Propósito:** Ajudar o usuário a identificar e reportar a discrepância de forma visual

---

## 📸 Passo 1: Reproduzir o Problema

### No Dashboard:

1. **Abra a página:** http://localhost:5006 ou caixa360.up.railway.app
2. **Localize "Indicadores de Performance"** (KPI Cards no topo)
3. **Mude o período** usando o dropdown (ex: "Este mês" → "Últimos 30 dias")

---

## 📊 Passo 2: Observar os Dois Totais

### Onde Encontrar os Números

```
┌─────────────────────────────────────────────────────────────┐
│     INDICADORES DE PERFORMANCE (KPI Cards)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │    💰 Receita    │  │    💸 Despesa    │                │
│  │  R$ 10.000,00    │  │  R$ 2.500,00     │    ← KPI MOSTRA│
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│     HISTÓRICO (Tabela de Registros)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Período: _______ a _______   [Todas categorias]            │
│                                                              │
│                                                              │
│  Receitas (R$)    Despesas (R$)    Total do período (R$)    │
│  R$ 10.000,00     -R$ 2.400,00     R$ 7.600,00             │ ← HISTÓRICO MOSTRA
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Data  │ Tipo      │ Categoria │ Total      │  Ações    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ 05/08 │ Receita   │ Salão     │ R$ 5.000  │           ││
│  │ 05/07 │ Despesa   │ Salão     │ -R$ 1.000 │           ││
│  │ 05/06 │ Receita   │ iFood     │ R$ 5.000  │           ││
│  │ 05/05 │ Despesa   │ iFood     │ -R$ 1.400 │           ││
│  │ ...   │ ...       │ ...       │ ...       │           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔴 Indicadores de Discrepância

### O QUE VOCÊ VÊ

```
SITUAÇÃO NORMAL ✅
═════════════════════════════════════════════════════════════

KPI Mostra:
  Receita:  R$ 10.000,00
  Despesa:  R$ 2.500,00
  
Histórico Mostra (Resumo):
  Receitas:  R$ 10.000,00  ✅ IGUAIS
  Despesas:  -R$ 2.500,00  ✅ IGUAIS
  Total:     R$ 7.500,00


DISCREPÂNCIA OBSERVADA ❌
═════════════════════════════════════════════════════════════

KPI Mostra:
  Receita:  R$ 10.000,00
  Despesa:  R$ 2.500,00
  
Histórico Mostra (Resumo):
  Receitas:  R$ 10.000,00  ✅ OK
  Despesas:  -R$ 2.400,00  ❌ DIFERENTE!
  Total:     R$ 7.600,00   ❌ DIFERENTE!

Diferença em DESPESAS: R$ 2.500,00 - R$ 2.400,00 = R$ 100,00 ❌
```

---

## 📋 Checklist: O Que Verificar Quando Vir Discrepância

- [ ] **Data Range Visível**
  - Qual período está sendo visualizado?
  - Nota o período exato que mostrou diferença

- [ ] **Números Exatos**
  - Que valor o KPI mostra em DESPESAS?
  - Que valor o Histórico mostra em DESPESAS?
  - Qual a diferença exata?

- [ ] **Contexto**
  - Qual dropdown foi selecionado? (Este mês, Últimos 30 dias, etc)
  - Se "Personalizado", quais datas?
  - Há alguma categoria selecionada?

---

## 🖼️ Exemplo Real de Captura de Tela (Template)

Quando reportar a discrepância, capturar assim:

```
┌─ SCREENSHOT 1: KPI Cards (Topo da página)
│
│  [Print Screen mostrando:
│   - O período selecionado no dropdown
│   - Os números dos KPI Cards (Receita, Despesa, Líquido)
│   - A data/hora da captura
│  ]
│
└─ SCREENSHOT 2: Histórico Table (Resumo)
   
   [Print Screen mostrando:
    - O filtro de período no Histórico
    - O resumo com Receitas, Despesas, Total
    - Scroll dos registros para confirmar o período
   ]
```

---

## 💻 Passos para Capturar Automaticamente os Dados

### Método 1: Via Console do Navegador (Recomendado)

```javascript
// 1. Abrir DevTools: F12
// 2. Clicar na aba "Console"
// 3. Copiar e colar este código:

(function() {
  const app = window.app.$data;
  const resultado = {
    timestamp: new Date().toISOString(),
    
    // KPI Stats
    stats: {
      totalReceita: app.stats?.totalReceita,
      totalDespesa: app.stats?.totalDespesa,
      totalLiquido: app.stats?.totalLiquido,
    },
    
    // Filtro do Histórico
    filtro_historico: {
      dataInicio: app.filtroHistorico?.dataInicio,
      dataFim: app.filtroHistorico?.dataFim,
      filtroPreset: app.filtroHistorico?.filtroPreset,
      categoria: app.filtroHistorico?.categoria,
    },
    
    // Resumo do Histórico
    resumo_filtrado: {
      totalReceita: app.resumoFiltrado?.totalReceita,
      totalDespesa: app.resumoFiltrado?.totalDespesa,
      totalLiquido: app.resumoFiltrado?.totalLiquido,
    },
    
    // Contador de registros
    receitas_carregadas: app.receitas?.length,
    receitas_filtradas: app.receitasFiltradas?.length,
  };
  
  console.log('='.repeat(60));
  console.log('📊 DIAGNÓSTICO DE DISCREPÂNCIA');
  console.log('='.repeat(60));
  console.log(JSON.stringify(resultado, null, 2));
  console.log('='.repeat(60));
  console.log('\n✅ Copie o texto acima e envie para análise');
  
  // Copiar automaticamente para clipboard (opcional)
  navigator.clipboard.writeText(JSON.stringify(resultado, null, 2))
    .then(() => console.log('✅ Dados copiados para clipboard!'))
    .catch(err => console.error('Erro ao copiar:', err));
})();

// 4. Clicar com botão direito na saída → Copy
// 5. Enviar o conteúdo
```

### Método 2: Via Screenshot + Anotações

Se o Método 1 não funcionar, fazer:

```
1. Screenshot do KPI mostrando:
   □ Título "Indicadores de Performance"
   □ Dropout com período selecionado (ex: "Este mês")
   □ Cards de Receita/Despesa/Líquido com valores

2. Screenshot do Histórico mostrando:
   □ Filtro de período no Histórico
   □ Resumo (Receitas, Despesas, Total)
   □ Pelo menos 5 registros da tabela

3. Texto anotando:
   - Período: De X até Y
   - Receita no KPI: R$ XXXX
   - Despesa no KPI: R$ YYYY
   - Receita no Histórico: R$ XXXX
   - Despesa no Histórico: R$ YYYY
   - Diferença: R$ ZZZ
```

---

## 🔧 Teste Rápido: Testar Múltiplos Períodos

Para ajudar a identificar padrão:

```
Período 1: 2026-05-01 a 2026-05-08
  - Diferença? SIM / NÃO
  - Valor: R$ ________

Período 2: 2026-05-08 a 2026-05-08 (apenas 1 dia)
  - Diferença? SIM / NÃO
  - Valor: R$ ________

Período 3: 2026-04-08 a 2026-05-08 (30 dias)
  - Diferença? SIM / NÃO
  - Valor: R$ ________

Período 4: Todo o período
  - Diferença? SIM / NÃO
  - Valor: R$ ________
```

Se há diferença em TODOS os períodos → Problema sistemático
Se há diferença em ALGUNS períodos → Problema específico daquele período

---

## 🎯 O QUE NÃO É DISCREPÂNCIA

### Casos Normais (Não são problemas)

```
❌ NÃO É DISCREPÂNCIA:

1. Números diferentes quando muda de período
   • Esperado! Cada período tem dados diferentes

2. Histórico mostra paginado (1-50 de 100 registros)
   • OK! Histórico pagina, mas cálculo é de TODOS filtrados

3. Receita do KPI diferente do Histórico
   • Esperado se houver registros de datas fora do range

4. Pequena diferença (centavos)
   • Pode ser rounding do navegador vs banco

✅ É DISCREPÂNCIA (Relatar):

1. Mesma data no KPI e Histórico, mas totais diferentes
   • Exatamente: KPI 2026-05-01 a 2026-05-08, Histórico 2026-05-01 a 2026-05-08
   • KPI DESPESA: R$ 2.500,00
   • Histórico DESPESA: R$ 2.400,00
```

---

## 📞 Como Reportar

Quando identificar discrepância:

**Título da Mensagem:**
```
❌ DISCREPÂNCIA: KPI Despesa R$ 2.500 vs Histórico R$ 2.400 (Período 2026-05-01 a 2026-05-08)
```

**Conteúdo:**

```
📋 RELATÓRIO DE DISCREPÂNCIA

**Período:** De 2026-05-01 até 2026-05-08
**Data do Relato:** [data de hoje]
**Navegador:** [Chrome/Firefox/Safari]

📊 NÚMEROS

KPI Cards mostra:
- Receita:  R$ 10.000,00
- Despesa:  R$ 2.500,00

Histórico mostra:
- Receita:  R$ 10.000,00
- Despesa:  R$ 2.400,00

❌ DISCREPÂNCIA:
- Receita: OK ✅
- Despesa: R$ 100,00 diferença ❌

📋 DIAGNÓSTICO:
[Colar saída do console ou screenshot]
```

---

## 🚀 Próximos Passos Automáticos

Ao enviar dados:

1. **Análise Automática:** Script `test-discrepancia-despesas.js` será executado
2. **Diagnóstico:** Resultado mostrará a causa exata
3. **Fix:** Será implementado conforme necessário
4. **Teste:** Você testará para confirmar resolução

---

**Documento Criado:** 2026-05-08  
**Status:** Pronto para Uso
