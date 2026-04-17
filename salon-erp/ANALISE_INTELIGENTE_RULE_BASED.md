# 🔍 Análise Inteligente Rule-Based

## Visão Geral

Sistema de análise automática de CMV que **não depende de APIs de IA**. Implementado com regras inteligentes que:
- 🚨 Detecta problemas automaticamente
- 📈 Analisa tendências
- 💡 Fornece recomendações práticas
- 🎯 Compara com benchmark do setor
- ✅ Funciona **100% offline**

---

## 📊 O que a Análise Fornece

### 1. Situação Geral (Status)

**Avalia CMV em 4 níveis:**

| Status | CMV % | Cor | Significado |
|--------|-------|-----|-------------|
| 🟢 EXCELENTE | < 20% | Verde | CMV muito baixo, margem excelente |
| 🔵 SAUDÁVEL | 20-30% | Azul | CMV ideal, operação equilibrada |
| 🟡 ALERTA | 30-35% | Amarelo | CMV elevado, atenção necessária |
| 🔴 CRÍTICO | > 35% | Vermelho | CMV muito alto, ação imediata |

**Exemplo (seus dados):**
```
📊 Status: EXCELENTE
CMV: 8.31% (19.19% ABAIXO do ideal)
Margem: 91.69%
Descrição: "Ótima margem de lucro!"
```

### 2. Tendência

Analisa os **últimos 5 dias** e classifica em:

- **📈 MELHORANDO**: Margem aumentando (+ > 5%)
- **📉 PIORANDO**: Margem caindo (- < -5%)
- **➡️ ESTÁVEL**: Margem estável (variação pequena)

**Exemplo (seus dados):**
```
Tendência: MELHORANDO
Variação: +19.23% nos últimos dias
Média: 9.36%
```

### 3. Problemas Identificados

**Detecta automaticamente:**

- ❌ CMV muito alto
- 📊 CMV aumentando vs período anterior
- 🎯 Subcategoria dominante (mais de 5% da receita)
- ⚠️ Anomalias (margem negativa, dados inconsistentes)

**Exemplo (seus dados):**
```
⚠️ [AVISO] CMV aumentou 8.31% vs período anterior
⚠️ [ATENÇÃO] 3 dias com margem negativa (despesa > receita)
```

### 4. Recomendações Práticas

**Priorizadas por impacto:**

| Prioridade | Ação | Exemplo |
|-----------|------|---------|
| 🔴 ALTA | Impacto imediato | Auditoria de custos, Negociar fornecedor |
| 🟡 MÉDIA | Importante | Investigar aumento de custos |
| 🔵 BAIXA | Otimização | Consolidar fornecedores |

**Exemplo (seus dados):**
```
🔬 [MÉDIA] Investigar Aumento de Custos
Detalhes: CMV aumentou 8.31% vs período anterior
Impacto: Controlar escalada de custos

✅ [MÉDIA] Manter Estratégia Atual
Detalhes: Seu CMV está excepcional
Impacto: Manter margem de lucro saudável
```

### 5. Comparação com Benchmark

Compara com o padrão do setor (20-35% CMV):

```
Seu CMV: 8.31%
CMV Ideal: 27.5%
Diferença: 19.19% ABAIXO (Excelente!)

Impacto Financeiro:
- Se tivesse CMV ideal: R$ 45.381,53
- Sua economia: R$ 31.668,06/período
```

### 6. Análise por Subcategoria

**Top 10 subcategorias com:**
- Total gasto
- % da receita
- Quantidade de transações
- Média, Maior, Menor valor
- 💰 **Potencial de economia** (10% de redução)

**Recomendações por posição:**
- 🎯 **#1**: "Foco em negociação - maior impacto"
- 📌 **#2-3**: "Monitorar regularmente"
- 📊 **#4-5**: "Acompanhar tendências"
- ✓ **#6+**: "Sob controle"

**Exemplo (seus dados):**
```
1. Hortifruti: R$ 4.714,12 (2.86% receita)
   💰 Economia potencial: R$ 471,41

2. Bebidas: R$ 2.940,03 (1.78% receita)
   💰 Economia potencial: R$ 294,00
```

### 7. Relatório Formatado

Resumo em texto pronto para:
- 📧 Enviar por email
- 🖨️ Imprimir
- 📊 Compartilhar com equipe
- 📑 Arquivar como documento

---

## 🔧 Como Funciona

### Backend: `CMVAnalyzer.js`

**Arquivo:** `backend/utils/CMVAnalyzer.js`

**Métodos principais:**
```javascript
// Analisar dados e retornar objeto estruturado
CMVAnalyzer.analisar(dadosCMV)
  ↓
  {
    situacao: {...},        // Status geral
    tendencias: {...},      // Tendência
    problemas: [...],       // Problemas detectados
    recomendacoes: [...],   // Sugestões práticas
    comparacao: {...},      // vs Benchmark
    subcategoriaAnalise: [...], // Top categorias
    relatorio: "..."        // Texto formatado
  }

// Gerar relatório em texto
CMVAnalyzer.gerarRelatorio(dadosCMV)
  ↓ "=== ANÁLISE DE CMV ===\n..."
```

### Endpoint: `/api/cmv-inteligente/analisar`

**Request:**
```bash
POST /api/cmv-inteligente/analisar
Content-Type: application/json

{
  "from": "2026-04-01",
  "to": "2026-04-16"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* dados de CMV */ },
  "analise": {
    "situacao": { /* status geral */ },
    "tendencias": { /* tendência */ },
    "problemas": [ /* lista */ ],
    "recomendacoes": [ /* lista */ ],
    "comparacao": { /* vs benchmark */ },
    "subcategoriaAnalise": [ /* top 10 */ ],
    "dataAnalise": "2026-04-17T17:06:56.053Z"
  },
  "relatorio": "=== ANÁLISE DE CMV ===\n...",
  "tipo": "rule-based",
  "aviso": null
}
```

### Frontend: Nova Interface

**Localização:** Tab "🔍 Análise Inteligente"

**Seções:**
1. ✓ Cards de Situação (com cores)
2. ✓ Status de Tendência
3. ✓ Comparação com Benchmark
4. ✓ Problemas Identificados
5. ✓ Recomendações Priorizadas
6. ✓ Top Subcategorias
7. ✓ Relatório Completo

**Interação:**
```
[📊 Analisar Dados] → Carrega dados → Gera análise → Exibe resultados
```

---

## 🎯 Lógica de Regras

### Regra 1: Avaliação de CMV

```javascript
if (CMV < 20%) → EXCELENTE
else if (CMV <= 30%) → SAUDÁVEL
else if (CMV <= 35%) → ALERTA
else → CRÍTICO
```

### Regra 2: Detecção de Tendência

```javascript
// Pega últimos 5 dias válidos de margem
variacao = margem_atual - margem_inicial

if (variacao > 5%) → MELHORANDO 📈
else if (variacao < -5%) → PIORANDO 📉
else → ESTÁVEL ➡️
```

### Regra 3: Problemas

**CMV Alto:**
- Se CRÍTICO → Problema "CMV_ALTO"
- Se ALERTA → Problema "CMV_ELEVADO"

**Variação:**
- Se CMV aumentou > 3% → "VARIACAO_AUMENTANDO"

**Subcategoria Dominante:**
- Se % da receita > 5% → "SUBCATEGORIA_DOMINANTE"

**Anomalias:**
- Se margem < -50% → "ANOMALIA_DADOS"

### Regra 4: Recomendações

```javascript
if (CMV_ALTO) {
  sugerir("Auditoria de Custos", ALTA)
  sugerir("Negociar maior subcategoria", ALTA)
}

if (VARIACAO_AUMENTANDO) {
  sugerir("Investigar aumento de custos", MÉDIA)
}

if (CMV_EXCELENTE) {
  sugerir("Manter estratégia atual", MÉDIA)
}

if (muitas_subcategorias) {
  sugerir("Consolidar fornecedores", BAIXA)
}
```

---

## 📈 Exemplo Real (Seus Dados)

### Entrada:
```
Período: 2026-04-01 a 2026-04-16
Receita Total: R$ 165.023,76
CMV Total: R$ 13.709,23
```

### Análise Gerada:

```
📊 SITUAÇÃO: EXCELENTE
CMV 8.31% está ABAIXO do ideal (27.5%)
Economia: R$ 31.668,06 vs benchmark

📈 TENDÊNCIA: MELHORANDO
Margem aumentou 19.23% nos últimos dias
Dados estáveis e melhorando

⚠️ PROBLEMAS (2)
1. CMV aumentou 8.31% vs período anterior
2. 3 dias com anomalia (margem negativa)

💡 RECOMENDAÇÕES (3)
1. [MÉDIA] Investigar causa da variação
2. [MÉDIA] Manter estratégia (está ótima!)
3. [BAIXA] Consolidar com menos fornecedores

🎯 BENCHMARK
Seu CMV: 8.31% vs Ideal: 27.5%
Diferença: -19.19% (ÓTIMA!)

📍 TOP 5 DESPESAS
1. Hortifruti: R$ 4.714 (2.86%) - Economia: R$ 471
2. Bebidas: R$ 2.940 (1.78%) - Economia: R$ 294
3. Atacado: R$ 1.793 (1.09%) - Economia: R$ 179
4. Compra Atacado: R$ 969 (0.59%) - Economia: R$ 97
5. Carne: R$ 948 (0.57%) - Economia: R$ 95
```

---

## ✨ Vantagens da Solução Rule-Based

| Aspecto | Rule-Based | API IA |
|---------|-----------|--------|
| 💰 Custo | ✅ Grátis | ❌ Pago |
| 🚀 Velocidade | ✅ Instantâneo | ⏳ ~5-30s |
| 🔒 Privacidade | ✅ Offline | ⚠️ Envia dados |
| 🎯 Consistência | ✅ Determinístico | ⚠️ Variável |
| 🛠️ Confiabilidade | ✅ 100% | ⚠️ Depende API |
| 👤 Customização | ✅ Fácil | ⚠️ Difícil |

---

## 🚀 Próximas Melhorias

Possíveis expansões (sem custo de API):

1. **Alertas em Tempo Real**
   - Notificar quando CMV > limite definido
   - Alertar sobre anomalias

2. **Histórico & Comparações**
   - Gráficos de evolução de problemas
   - Tracking de recomendações aplicadas

3. **Customização de Benchmarks**
   - Permitir ajustar benchmark por categoria
   - Definir limite de alerta

4. **Integração com Workflow**
   - Atribuir recomendações a pessoas
   - Rastrear ações tomadas

5. **Exportação de Relatórios**
   - PDF com análise completa
   - CSV com dados estruturados

---

## 📞 Suporte & Uso

**Para usar:**
1. Acesse tab "🔍 Análise Inteligente"
2. Selecione período (date range)
3. Clique "📊 Analisar Dados"
4. Revise a análise gerada
5. Implemente recomendações

**Sem necessidade de:**
- ❌ API key
- ❌ Internet
- ❌ Custos
- ❌ Configuração complexa

**Tudo funciona offline e imediatamente!** ✅

---

**Versão:** 1.0 (Rule-Based)  
**Data:** Abril 2026  
**Status:** ✅ Pronto para Produção
