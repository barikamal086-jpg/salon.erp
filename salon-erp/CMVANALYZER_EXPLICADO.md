# 🔍 CMVAnalyzer - Explicação Detalhada

## 📐 Arquitetura Geral

```
ENTRADA: dadosCMV { periodo, resumo, cmvDetalhado, tendencia }
    ↓
CMVAnalyzer.analisar(dadosCMV)
    ↓
┌─────────────────────────────────────┐
│  7 MÉTODOS ESPECIALIZADOS           │
├─────────────────────────────────────┤
│ 1. avaliarSituacao()     → Status    │
│ 2. analisarTendencias()  → Tendência │
│ 3. identificarProblemas()→ Problemas │
│ 4. gerarRecomendacoes()  → Sugestões │
│ 5. compararComBenchmark()→ Comparação│
│ 6. analisarSubcategorias()→Top 10    │
│ 7. gerarRelatorio()      → Texto     │
└─────────────────────────────────────┘
    ↓
SAÍDA: { situacao, tendencias, problemas, recomendacoes, ... }
```

---

## 1️⃣ MÉTODO: `avaliarSituacao()`

**O que faz:** Classifica o CMV em 4 status

### Lógica de Decisão:

```javascript
BENCHMARKS = {
  CMV_MINIMO: 20,      // Limite inferior esperado
  CMV_IDEAL: 27.5,     // Meio do intervalo ideal
  CMV_MAXIMO: 35,      // Limite superior aceitável
  MARGEM_MINIMA: 65    // Margem mínima esperada
}

// Algoritmo:
if (CMV < 20) {
  status = "EXCELENTE" ✅
  cor = "green"
  descricao = "CMV muito baixo"
  
} else if (CMV <= 27.5) {
  status = "SAUDÁVEL" ✅
  cor = "blue"
  descricao = "CMV ideal"
  
} else if (CMV <= 35) {
  status = "ALERTA" ⚠️
  cor = "yellow"
  descricao = "CMV elevado"
  
} else {
  status = "CRÍTICO" 🔴
  cor = "red"
  descricao = "CMV muito alto"
}
```

### Exemplo Prático (Seus Dados):

```
INPUT:
  CMV = 9.77%
  Margem = 90.23%

PROCESSAMENTO:
  9.77 < 20? → SIM ✅
  
OUTPUT:
  {
    status: "EXCELENTE",
    cor: "green",
    descricao: "CMV em 9.77% está abaixo do esperado. Ótima margem!",
    cmvPercentual: 9.77,
    margemBruta: 90.23,
    benchmark: { ... }
  }
```

### Customização:

Para mudar os benchmarks:

```javascript
// Em CMVAnalyzer.js, mude:
static BENCHMARKS = {
  CMV_MINIMO: 15,      // ← Mude aqui (antes era 20)
  CMV_IDEAL: 22,       // ← Mude aqui
  CMV_MAXIMO: 30,      // ← Mude aqui
  MARGEM_MINIMA: 70
};
```

---

## 2️⃣ MÉTODO: `analisarTendencias()`

**O que faz:** Detecta se CMV está melhorando, piorando ou estável

### Lógica:

```javascript
// 1. Pega os últimos 5 dias de margem
margens = [98.15, 99.10, 56.50, -89.60, -142.96]

// 2. Filtra valores válidos (-100 a 100)
margensValidas = [98.15, 99.10, 56.50]

// 3. Calcula variação
variacao = margem_ultima - margem_primeira
variacao = 56.50 - 98.15 = -41.65

// 4. Classifica
if (variacao > 5)  → MELHORANDO 📈
if (variacao < -5) → PIORANDO 📉
else               → ESTÁVEL ➡️
```

### Exemplo Prático:

```
INPUT:
  Últimos 5 dias: [100, 99, 98, 97, 96]
  
PROCESSAMENTO:
  Margem inicial: 100
  Margem final: 96
  Variação: 96 - 100 = -4
  
OUTPUT:
  {
    status: "ESTÁVEL",
    emoji: "➡️",
    descricao: "Margem estável...",
    variacao: "-4.00",
    mediaRecente: "98.00",
    diasAnalisados: 5
  }
```

### Por que filtra valores?

```javascript
// Dados podem ter anomalias
margens = [98, 99, -500, 200, 50]
         //       ↑ anomalia   ↑ anomalia

// Após filtro (-100 a 100):
margensValidas = [98, 99, 50]
```

---

## 3️⃣ MÉTODO: `identificarProblemas()`

**O que faz:** Detecta automaticamente 4 tipos de problemas

### Tipo 1: CMV Alto

```javascript
if (situacao.status === "CRÍTICO") {
  problemas.push({
    tipo: "CMV_ALTO",
    severidade: "CRÍTICA",
    descricao: `CMV de ${cmv}% está MUITO acima do benchmark`,
    impacto: "Margem de lucro comprometida",
    emoji: "🔴"
  });
}

if (situacao.status === "ALERTA") {
  problemas.push({
    tipo: "CMV_ELEVADO",
    severidade: "ALERTA",
    descricao: `CMV de ${cmv}% está no limite`,
    emoji: "🟡"
  });
}
```

**Exemplo:**
```
CMV = 40% → CRÍTICO
   ↓
Problema detectado:
  "CMV de 40% está MUITO acima do benchmark (máximo 35%)"
```

---

### Tipo 2: Variação Aumentando

```javascript
if (variacao > 3) {
  problemas.push({
    tipo: "VARIACAO_AUMENTANDO",
    severidade: "AVISO",
    descricao: `CMV aumentou ${variacao}% vs período anterior`,
    impacto: "Tendência de piora nos custos",
    emoji: "⚠️"
  });
}
```

**Exemplo:**
```
CMV anterior: 5%
CMV atual: 10%
Variação: +5%
   ↓
Problema: "CMV aumentou 5% vs período anterior"
```

---

### Tipo 3: Subcategoria Dominante

```javascript
const maiorDespesa = dadosCMV.cmvDetalhado[0];

if (maiorDespesa && maiorDespesa.percentualReceitaCMV > 5) {
  problemas.push({
    tipo: "SUBCATEGORIA_DOMINANTE",
    severidade: "INFO",
    descricao: `${maiorDespesa.subcategoria} representa ${maiorDespesa.percentualReceitaCMV}% da receita`,
    impacto: "Maior oportunidade de otimização",
    emoji: "📍"
  });
}
```

**Exemplo:**
```
Top despesa: Hortifruti = 3.47% da receita
   ↓
Problema detectado:
  "Hortifruti representa 3.47% da receita - oportunidade de otimização"
```

---

### Tipo 4: Anomalias

```javascript
const comMargemNegativa = dadosCMV.tendencia.filter(d => d.margem < -50);

if (comMargemNegativa.length > 0) {
  problemas.push({
    tipo: "ANOMALIA_DADOS",
    severidade: "ATENÇÃO",
    descricao: `${comMargemNegativa.length} dia(s) com margem negativa`,
    impacto: "Possível erro nos dados ou operação não-lucro",
    emoji: "⚠️"
  });
}
```

**Exemplo:**
```
Dias com margem < -50%: [2026-04-14, 2026-04-15]
   ↓
Problema: "2 dias com margem negativa (despesa > receita)"
```

---

## 4️⃣ MÉTODO: `gerarRecomendacoes()`

**O que faz:** Cria sugestões acionáveis baseadas nos problemas

### Lógica:

```javascript
// Para cada tipo de problema, gera recomendações
// com prioridade (ALTA, MÉDIA, BAIXA)

if (problemas.some(p => p.tipo === "CMV_ALTO")) {
  // Recomendação 1: Auditoria
  recomendacoes.push({
    prioridade: "ALTA",
    acao: "Auditoria de Custos",
    detalhes: "Revisar preços de fornecedores",
    impactoEsperado: "Potencial economia de 5-15%",
    emoji: "🔍"
  });
  
  // Recomendação 2: Negociar maior despesa
  const maiorDespesa = dadosCMV.cmvDetalhado[0];
  recomendacoes.push({
    prioridade: "ALTA",
    acao: `Negociar ${maiorDespesa.subcategoria}`,
    detalhes: `Esta categoria representa ${maiorDespesa.percentualReceitaCMV}%`,
    impactoEsperado: `Economizar R$ ${maiorDespesa.total * 0.1}`,
    emoji: "💰"
  });
}

// Se CMV está bom, manter estratégia
if (dadosCMV.resumo.cmvPercentual < BENCHMARKS.CMV_MINIMO) {
  recomendacoes.push({
    prioridade: "MÉDIA",
    acao: "Manter Estratégia Atual",
    detalhes: "Seu CMV está excepcional",
    impactoEsperado: "Manter margem de lucro saudável",
    emoji: "✅"
  });
}

// Se muitas subcategorias, consolidar
if (totalSubcategorias > 5) {
  recomendacoes.push({
    prioridade: "BAIXA",
    acao: "Consolidar Fornecedores",
    detalhes: "Você tem ${totalSubcategorias} subcategorias",
    impactoEsperado: "Melhor negociação de preços",
    emoji: "🤝"
  });
}
```

### Exemplo Prático:

```
PROBLEMAS IDENTIFICADOS:
  1. CMV_ALTO (severidade: CRÍTICA)
  2. VARIACAO_AUMENTANDO (severidade: AVISO)

RECOMENDAÇÕES GERADAS:
  1. [ALTA] Auditoria de Custos
     → Revisar preços de fornecedores
     → Economia: 5-15%
     
  2. [ALTA] Negociar Hortifruti
     → Representa 3.47% da receita
     → Economia: R$ 573
     
  3. [MÉDIA] Investigar Aumento de Custos
     → CMV aumentou 9.77%
     → Identificar causa da variação
```

---

## 5️⃣ MÉTODO: `compararComBenchmark()`

**O que faz:** Compara CMV atual com o ideal

### Cálculos:

```javascript
cmvAtual = 9.77%
cmvIdeal = 27.5%

diferenca = 9.77 - 27.5 = -17.73%
percentualDiferenca = (-17.73 / 27.5) * 100 = -64.47%

// Impacto financeiro
receita = 165.023,76
cmvIdeal = receita * (27.5 / 100) = 45.381,53
economia = 45.381,53 - 13.709,23 = 31.668,06

// Classificação
if (diferenca > 0) {
  avaliacao = "ACIMA do ideal (ruim)"
} else {
  avaliacao = "ABAIXO do ideal (ótimo!)"
}
```

### Retorno:

```javascript
{
  cmvAtual: "9.77",
  cmvIdeal: 27.5,
  diferenca: "-17.73",
  percentualDiferenca: "-64.47",
  avaliacao: "CMV 17.73% ABAIXO do ideal (Excelente!)",
  impactoMensal: {
    receita: 165023.76,
    cmvAtual: 13709.23,
    cmvIdeal: 45381.53,
    diferenca: -31668.06
  }
}
```

---

## 6️⃣ MÉTODO: `analisarSubcategorias()`

**O que faz:** Analisa Top 10 despesas com recomendações

### Lógica:

```javascript
dadosCMV.cmvDetalhado.map((item, index) => {
  const posicao = index + 1;
  let recomendacao = "";
  
  // Definir recomendação por posição
  if (posicao === 1) {
    recomendacao = "🎯 Foco em negociação - maior impacto";
  } else if (posicao <= 3) {
    recomendacao = "📌 Monitorar regularmente";
  } else if (posicao <= 5) {
    recomendacao = "📊 Acompanhar tendências";
  } else {
    recomendacao = "✓ Sob controle";
  }
  
  // Calcular economia potencial (10% de redução)
  potencialEconomia = item.total * 0.1;
  
  return {
    posicao,
    subcategoria: item.subcategoria,
    total: item.total,
    percentualReceita: item.percentualReceitaCMV,
    quantidade: item.quantidade,
    media: item.media,
    maior: item.maior,
    menor: item.menor,
    recomendacao,
    potencialEconomia  // ← Economia se reduzir 10%
  };
});
```

### Exemplo:

```
Posição 1: Hortifruti
  Total: R$ 5.729,04
  % Receita: 3.47%
  Quantidade: 15
  Recomendação: "🎯 Foco em negociação"
  Economia (10%): R$ 572,90
  
Posição 2: Bebidas
  Total: R$ 4.340,42
  % Receita: 2.63%
  Recomendação: "📌 Monitorar regularmente"
  Economia (10%): R$ 434,04
```

---

## 7️⃣ MÉTODO: `gerarRelatorio()`

**O que faz:** Cria relatório em texto formatado

```javascript
// Combina todos os dados em formato legível

let relatorio = "";

relatorio += "=== ANÁLISE DE CMV ===\n\n";

// Situação
relatorio += `${emoji} SITUAÇÃO: ${status}\n`;
relatorio += `${descricao}\n\n`;

// Tendência
relatorio += `${emoji} TENDÊNCIA: ${status}\n`;
relatorio += `${descricao}\n\n`;

// Benchmark
relatorio += "🎯 COMPARAÇÃO COM BENCHMARK\n";
relatorio += `CMV Ideal: ${ideal}% | CMV Atual: ${atual}%\n`;
relatorio += `${avaliacao}\n\n`;

// Problemas
if (problemas.length > 0) {
  relatorio += "⚠️ PROBLEMAS IDENTIFICADOS\n";
  problemas.forEach(p => {
    relatorio += `${p.emoji} [${p.severidade}] ${p.tipo}: ${p.descricao}\n`;
  });
}

// Recomendações
if (recomendacoes.length > 0) {
  relatorio += "💡 RECOMENDAÇÕES\n";
  recomendacoes.forEach(r => {
    relatorio += `${r.emoji} [${r.prioridade}] ${r.acao}\n`;
    relatorio += `   ${r.detalhes}\n`;
    relatorio += `   Impacto: ${r.impactoEsperado}\n`;
  });
}

// Top 5
relatorio += "📍 TOP 5 SUBCATEGORIAS\n";
subcategorias.slice(0, 5).forEach(s => {
  relatorio += `${s.posicao}. ${s.subcategoria}: R$ ${s.total}\n`;
  relatorio += `   ${s.recomendacao}\n`;
});

return relatorio;
```

### Output:

```
=== ANÁLISE DE CMV ===

📊 SITUAÇÃO: EXCELENTE
CMV em 9.77% está abaixo do esperado. Ótima margem!

📈 TENDÊNCIA: MELHORANDO
Margem melhorando! Variação de +19.23% nos últimos dias.

🎯 COMPARAÇÃO COM BENCHMARK
CMV Ideal: 27.5% | CMV Atual: 9.77%
CMV 17.73% ABAIXO do ideal (Excelente!)

⚠️ PROBLEMAS IDENTIFICADOS
⚠️ [AVISO] CMV aumentou 9.77% vs período anterior
⚠️ [ATENÇÃO] 3 dias com margem negativa

💡 RECOMENDAÇÕES
🔬 [MÉDIA] Investigar Aumento de Custos
   CMV aumentou 9.77% vs período anterior
   Impacto: Controlar escalada de custos

...
```

---

## 🔧 Como Customizar

### 1. Mudar Benchmarks:

```javascript
// Em CMVAnalyzer.js, linha 11:
static BENCHMARKS = {
  CMV_MINIMO: 15,      // ← Ajuste aqui
  CMV_IDEAL: 25,       // ← Ajuste aqui
  CMV_MAXIMO: 32,      // ← Ajuste aqui
  MARGEM_MINIMA: 68
};
```

### 2. Adicionar Nova Regra de Problema:

```javascript
// Em identificarProblemas(), adicione:
if (situacao.cmvPercentual > 15 && situacao.cmvPercentual < 20) {
  problemas.push({
    tipo: "CMV_ACIMA_ALVO",
    severidade: "AVISO",
    descricao: "CMV está acima da meta pessoal de 15%",
    impacto: "Revisar estratégia de custos",
    emoji: "📢"
  });
}
```

### 3. Adicionar Nova Recomendação:

```javascript
// Em gerarRecomendacoes(), adicione:
if (dadosCMV.cmvDetalhado.length > 15) {
  recomendacoes.push({
    prioridade: "BAIXA",
    acao: "Simplificar Menu",
    detalhes: "Você tem muitas subcategorias de compra",
    impactoEsperado: "Reduzir complexidade operacional",
    emoji: "📋"
  });
}
```

---

## 📊 Fluxo Completo - Exemplo

```
ENTRADA: dadosCMV para período 2026-04-01 a 2026-04-30
├─ periodo: {inicio: "2026-04-01", fim: "2026-04-30", dias: 30}
├─ resumo: {totalReceita: 165023.76, totalCMV: 16124.54, cmvPercentual: 9.77}
├─ cmvDetalhado: [{subcategoria: "Hortifruti", total: 5729.04}, ...]
└─ tendencia: [{data: "2026-04-01", receita: 3609.7, cmv: 14686.92, margem: -306.87}, ...]

     ↓ CMVAnalyzer.analisar()

┌─ avaliarSituacao()
│  INPUT: cmv=9.77%, margem=90.23%
│  PROCESSAMENTO: 9.77 < 20? → SIM
│  OUTPUT: {status: "EXCELENTE", cor: "green", ...}
│
├─ analisarTendencias()
│  INPUT: últimos 5 dias = [100, 99, 98, 50, 0]
│  PROCESSAMENTO: variacao = 0 - 100 = -100
│  OUTPUT: {status: "PIORANDO", variacao: "-100", ...}
│
├─ identificarProblemas()
│  INPUT: situacao, variacao
│  PROCESSAMENTO: variacao > 3? → SIM → adicionar problema
│  OUTPUT: [{tipo: "VARIACAO_AUMENTANDO", ...}, ...]
│
├─ gerarRecomendacoes()
│  INPUT: problemas detectados
│  PROCESSAMENTO: Para cada problema → gerar ação
│  OUTPUT: [{prioridade: "MÉDIA", acao: "Investigar", ...}, ...]
│
├─ compararComBenchmark()
│  INPUT: cmv=9.77%, benchmark=27.5%
│  PROCESSAMENTO: diferenca = 9.77 - 27.5 = -17.73
│  OUTPUT: {cmvAtual: "9.77", cmvIdeal: 27.5, ...}
│
├─ analisarSubcategorias()
│  INPUT: cmvDetalhado array
│  PROCESSAMENTO: Para cada item → calcular recomendação
│  OUTPUT: [{posicao: 1, subcategoria: "Hortifruti", ...}, ...]
│
└─ gerarRelatorio()
   INPUT: todos os dados acima
   PROCESSAMENTO: formatar em texto
   OUTPUT: "=== ANÁLISE DE CMV ===\n..."

     ↓

SAÍDA: {
  situacao: {...},
  tendencias: {...},
  problemas: [...],
  recomendacoes: [...],
  comparacao: {...},
  subcategoriaAnalise: [...],
  relatorio: "...",
  dataAnalise: "2026-04-17T17:11:49.053Z"
}
```

---

## ✨ Resumo

| Método | Entrada | Saída | Propósito |
|--------|---------|-------|-----------|
| `avaliarSituacao()` | CMV % | Status (Excelente/Saudável/Alerta/Crítico) | Classificar situação |
| `analisarTendencias()` | Últimos 5 dias | Melhorando/Piorando/Estável | Detectar tendência |
| `identificarProblemas()` | Dados + Status | Lista de problemas | Alertar sobre anomalias |
| `gerarRecomendacoes()` | Problemas | Lista acionável | Sugerir ações |
| `compararComBenchmark()` | CMV atual vs ideal | Impacto financeiro | Comparar performance |
| `analisarSubcategorias()` | Despesas | Top 10 com economia | Priorizar otimizações |
| `gerarRelatorio()` | Todos os dados | Texto formatado | Criar documento |

---

## 🎓 Próximas Dúvidas?

Quer saber mais sobre:
- **Como adicionar novas regras?**
- **Como integrar com BD para persistir análises?**
- **Como testar o CMVAnalyzer?**
- **Como usar em produção?**
- **Algo mais específico?**
