# 🚀 MELHORIAS FUTURAS: Performance por Categoria

**Status:** Sugestões de Features  
**Versão:** v1.1+ (Roadmap)  
**Data:** 2026-05-04

---

## 📋 MELHORIAS PROPOSTAS

### Melhoria #1: Auditoria de Alocação (Debug Endpoint)

**Objetivo:** Rastrear exatamente como cada despesa do Salão foi alocada para outros canais

**Endpoint a Criar:** `GET /api/faturamentos/auditoria-alocacao`

```javascript
router.get('/faturamentos/auditoria-alocacao', async (req, res) => {
  const { from, to } = req.query;
  
  // Retornar informações detalhadas de alocação
  const auditoria = {
    periodo: { from, to },
    despesaSalao: {
      total: 20000,
      linhas: [
        { id: 42, data: '2026-04-05', descricao: 'Aluguel', valor: 5000 },
        { id: 43, data: '2026-04-05', descricao: 'Funcionários', valor: 10000 },
        { id: 44, data: '2026-04-05', descricao: 'Utilidades', valor: 5000 }
      ]
    },
    receitas: {
      salao: 100000,
      ifood: 80000,
      keeta: 60000,
      '99food': 70000,
      total: 310000
    },
    alocacoes: {
      ifood: {
        proporcao: '25.81%',
        recebeu: 6452,
        origem: 'Distribuição proporcional de R$ 20.000 (aluguel + funcionários + utilidades)'
      },
      keeta: {
        proporcao: '19.35%',
        recebeu: 4839,
        origem: '...'
      },
      '99food': {
        proporcao: '22.58%',
        recebeu: 5645,
        origem: '...'
      },
      naoAlocado: 6452 // Rounding error
    }
  };
  
  res.json({ success: true, data: auditoria });
});
```

**Benefício:** Transparência total sobre como as despesas foram alocadas

---

### Melhoria #2: Comparação Período a Período

**Objetivo:** Ver tendências de uma categoria ao longo do tempo

**Endpoint a Criar:** `GET /api/faturamentos/trend-categoria`

```javascript
// GET /api/faturamentos/trend-categoria?categoria=iFood&meses=6
// Retorna últimos 6 meses de performance

{
  categoria: 'iFood',
  dados: [
    {
      mes: '2026-03',
      receita: 75000,
      despesaTaxas: 17000,
      despesaAlocada: 6100,
      totalDespesa: 23100,
      liquido: 51900,
      margem: 69.2
    },
    {
      mes: '2026-04',
      receita: 80000,
      despesaTaxas: 18000,
      despesaAlocada: 6452,
      totalDespesa: 24452,
      liquido: 55548,
      margem: 69.4
    },
    // ... outros 4 meses
  ],
  tendencias: {
    receitaMedia: 77500,
    margemMedia: 69.1,
    piorMes: '2026-03',
    melhorMes: '2026-04'
  }
}
```

**Benefício:** Análise de tendências e comparação período-a-período

---

### Melhoria #3: Previsão Inteligente (ML)

**Objetivo:** Prever performance futura baseado em histórico

**Implementação Sugerida:**
```javascript
// Usar regressão linear simples:
// Y = a + b*X
// Onde X = mês, Y = receita

calculateTrend(historico) {
  const n = historico.length;
  const x = Array.from({length: n}, (_, i) => i);
  const y = historico.map(h => h.receita);
  
  const xMean = x.reduce((a, b) => a + b) / n;
  const yMean = y.reduce((a, b) => a + b) / n;
  
  const b = (x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean)) / 
             x.reduce((sum, xi) => sum + (xi - xMean) ** 2));
  const a = yMean - b * xMean;
  
  // Prever próximo mês
  const proximoMes = n;
  const previsao = a + b * proximoMes;
  
  return previsao;
}
```

**Benefício:** Prever receitas e despesas para planejamento

---

### Melhoria #4: Alertas Automáticos

**Objetivo:** Notificar quando margens caem abaixo de threshold

**Exemplo:**
```javascript
// Se margem iFood cai abaixo de 65%, alertar:
if (iFood.margem < 0.65) {
  alert({
    tipo: 'warning',
    mensagem: 'Margem iFood caiu para 62% - acima das taxas?',
    categoria: 'iFood',
    valor: iFood.margem,
    threshold: 0.65,
    timestamp: new Date()
  });
}
```

**Benefício:** Ação rápida quando performance degrada

---

### Melhoria #5: Exportar Relatório (PDF)

**Objetivo:** Gerar relatório em PDF para compartilhar com sócios

**Endpoint a Criar:** `GET /api/faturamentos/exportar-performance-pdf`

```javascript
// GET /api/faturamentos/exportar-performance-pdf?from=2026-04-01&to=2026-04-30
// Retorna PDF com:
// - Tabela de Performance por Categoria
// - Gráficos (receita, despesa, margem)
// - Sumário executivo
// - Recomendações
```

**Benefício:** Fácil compartilhamento e presentação

---

### Melhoria #6: Recalcular Alocação (Admin)

**Objetivo:** Permitir ajustar manualmente se alocação estiver errada

**Endpoint a Criar:** `POST /api/faturamentos/realocar-despesas`

```javascript
// POST /api/faturamentos/realocar-despesas
{
  periodo: { from: '2026-04-01', to: '2026-04-30' },
  regra: 'proporcional' | 'igual' | 'customizado',
  customizado: {
    salao: 0,
    ifood: 0.30, // 30% das despesas
    keeta: 0.20, // 20% das despesas
    '99food': 0.50 // 50% das despesas
  }
}
```

**Benefício:** Flexibilidade para casos especiais

---

### Melhoria #7: Dashboard Dinâmico

**Objetivo:** Adicionar gráficos visuais de alocação

**Sugestões:**
1. **Pie Chart:** Divisão de receita (Salão vs iFood vs Keeta vs 99Food)
2. **Stacked Bar Chart:** Composição de despesa (Taxas vs Alocadas) por categoria
3. **Line Chart:** Evolução de margem ao longo do período
4. **Heatmap:** Performance matriz (categoria × semana)

---

### Melhoria #8: Multi-Período (Comparação)

**Objetivo:** Comparar 2-3 períodos lado-a-lado

**Exemplo:**
```javascript
// GET /api/faturamentos/comparar?
//   periodo1=2026-03-01,2026-03-31&
//   periodo2=2026-04-01,2026-04-30

{
  comparacao: [
    {
      categoria: 'iFood',
      periodo1: { receita: 75k, despesa: 23.1k, margem: 69.2 },
      periodo2: { receita: 80k, despesa: 24.5k, margem: 69.4 },
      variacao: {
        receita: '+6.7%',
        despesa: '+5.9%',
        margem: '+0.2%'
      }
    },
    // ... outras categorias
  ]
}
```

**Benefício:** Fácil identificar mudanças mês-a-mês

---

### Melhoria #9: Integração Conta Azul

**Objetivo:** Sincronizar despesas alocadas com Conta Azul

**Implementação:**
```javascript
// Ao processar notas com regras, também enviar para Conta Azul
// com anotação: "Despesa iFood (R$ 6.452 alocado do aluguel)"
```

**Benefício:** Contabilidade totalmente sincronizada

---

### Melhoria #10: Histórico de Alocações

**Objetivo:** Ver log de todas as alocações feitas

**Tabela:** `allocation_logs`
```sql
CREATE TABLE allocation_logs (
  id SERIAL PRIMARY KEY,
  periodo_start DATE,
  periodo_end DATE,
  categoria VARCHAR(50),
  despesa_alocada DECIMAL(10,2),
  proporcao DECIMAL(5,2),
  created_at TIMESTAMP
);
```

**Benefício:** Auditoria completa e histórico

---

## 🔧 MATRIZ DE PRIORIZAÇÃO

| # | Melhoria | Dificuldade | Impacto | Prioridade | Tempo Est. |
|---|----------|-----------|--------|-----------|-----------|
| 1 | Auditoria Alocação | Baixa | Alto | 🔴 ALTA | 2h |
| 2 | Comparação Período | Média | Alto | 🟡 MÉDIA | 4h |
| 3 | Previsão ML | Alta | Médio | 🟢 BAIXA | 6h |
| 4 | Alertas Automáticos | Média | Médio | 🟡 MÉDIA | 3h |
| 5 | Exportar PDF | Alta | Médio | 🟡 MÉDIA | 5h |
| 6 | Recalcular Alocação | Média | Alto | 🔴 ALTA | 3h |
| 7 | Dashboard Dinâmico | Média | Alto | 🟡 MÉDIA | 4h |
| 8 | Multi-Período | Média | Médio | 🟡 MÉDIA | 3h |
| 9 | Integração Conta Azul | Alta | Alto | 🔴 ALTA | 6h |
| 10 | Histórico Alocações | Baixa | Médio | 🟢 BAIXA | 2h |

---

## 📊 ROADMAP SUGERIDO

### **Sprint 1 (Curto Prazo - 1-2 semanas)**
- [x] ✅ Auditoria de Alocação (Debug endpoint)
- [x] ✅ Comparação Período-a-Período
- [x] ✅ Dashboard com Gráficos Básicos

### **Sprint 2 (Médio Prazo - 2-4 semanas)**
- [ ] Alertas Automáticos
- [ ] Recalcular Alocação (Admin)
- [ ] Multi-Período Comparação

### **Sprint 3 (Longo Prazo - 4-8 semanas)**
- [ ] Exportar PDF
- [ ] Integração Conta Azul
- [ ] Previsão ML

### **Sprint 4+ (Backlog)**
- [ ] Histórico Alocações
- [ ] API Pública para Integrações
- [ ] Mobile App

---

## 💡 IDEIAS ADICIONAIS

### Customização por Usuário
```javascript
// Cada sócio pode ter preferências:
preferences: {
  moedaPadrao: 'BRL',
  casasDecimais: 2,
  formatoData: 'DD/MM/YYYY',
  diasPorPeriodo: 30,
  limiteAlertas: {
    margem: 0.65,
    despesa: 0.40
  }
}
```

### Suporte Multi-Restaurant
```javascript
// Expandir para múltiplos restaurantes
// Se um dia KAIA tiver múltiplas unidades:
endpoint: '/api/restaurante/:id/faturamentos/stats-categoria'
```

### Benchmark Industry
```javascript
// Comparar com benchmarks da indústria
// "Sua margem iFood (69%) está ACIMA da média (65%)"
```

### Integração BI (Power BI / Tableau)
```javascript
// Exportar dados em formato compatível
endpoint: '/api/faturamentos/export/csv'
endpoint: '/api/faturamentos/export/json'
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Implementar #1:** Auditoria de Alocação (maior valor, menor esforço)
2. **Implementar #2:** Comparação Período-a-Período
3. **Implementar #6:** Recalcular Alocação (ajuste manual)
4. **Monitorar:** Performance do sistema com grandes períodos
5. **Feedback:** Coletar feedback dos sócios sobre o que mais ajuda

---

**Documentado em:** 2026-05-04  
**Versão:** v1.0  
**Status:** Pronto para Revisão
