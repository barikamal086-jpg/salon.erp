# 📋 Plano de Ação: Auditoria de Discrepância de Despesas

**Data:** 2026-05-08  
**Problema:** Soma de DESPESAS diferente entre KPI Cards e Histórico Table  
**Status:** 🔍 Investigação em Andamento

---

## 🎯 O QUE FOI DESCOBERTO

### Arquitetura de Dados Identificada

**KPI Cards (Indicadores de Performance):**
- Usa API endpoint `GET /api/faturamentos/stats?from=X&to=Y`
- Calcula SQL SUM no BACKEND para data range explícito
- Retorna `totalReceita`, `totalDespesa`, `totalLiquido`

**Histórico Table:**
- Usa API endpoint `GET /api/faturamentos?days=365` (SEMPRE 365 dias!)
- Carrega TODOS os registros do banco
- Filtra CLIENT-SIDE usando JavaScript para data range
- Calcula totais com `.reduce()` em JavaScript

### Diferença Crítica Identificada

```
Backend (KPI):     Cálculo no SQL
Frontend (Histórico): Cálculo em JavaScript com parseFloat()
```

⚠️ **Isso pode gerar discrepâncias em:**
- Operações de ponto flutuante
- Precisão decimal
- Registros inseridos entre os dois carregamentos

---

## 📊 FERRAMENTAS DE DIAGNÓSTICO CRIADAS

### 1. Documento: `AUDITORIA_DISCREPANCIA_DESPESAS.md`

Análise completa com:
- Fluxo de dados de cada componente
- 5 possíveis causas (Status, Alocações, Timing, etc)
- Checklist de investigação
- Informações a coletar do usuário

### 2. Script: `backend/test-discrepancia-despesas.js`

Executa diagnóstico automático:

```bash
# Executar diagnóstico para período específico
node backend/test-discrepancia-despesas.js --from 2026-05-01 --to 2026-05-08
```

**O que ele faz:**
1. Compara totais SQL vs JavaScript
2. Analisa despesas por tipo
3. Verifica filtro de status
4. Analisa distribuição por categoria
5. Encontra valores outliers
6. Simula cálculo do frontend
7. Gera relatório comparativo

---

## 🔧 EXECUÇÃO DO DIAGNÓSTICO

### Passo 1: Coletar Informações do Usuário

Quando o usuário reporta discrepância novamente, solicitar:

```javascript
// Abrir DevTools (F12) → Console → Copiar e executar:

console.log({
  stats_kpi: window.app.$data.stats,
  filtro_historico: window.app.$data.filtroHistorico,
  resumo_filtrado: window.app.$data.resumoFiltrado,
  receitas_carregadas_total: window.app.$data.receitas.length,
  data_browser: new Date().toISOString()
});

// Copiar saída e enviar
```

### Passo 2: Executar Script de Diagnóstico

```bash
cd C:\Users\adm\Desktop\Claude\salon-erp
node backend/test-discrepancia-despesas.js --from 2026-05-01 --to 2026-05-08
```

Substituir datas pelo período que o usuário reportou.

### Passo 3: Analisar Saída

Script produzirá:

```
🔍 DIAGNÓSTICO DE DISCREPÂNCIA DE DESPESAS
════════════════════════════════════════════════════════════════════════════════
Período: 2026-05-01 a 2026-05-08

1️⃣  TOTAIS DIRETO DO BANCO (Backend Query)
   Total Receitas:      X registros
   Total Despesas:      Y registros
   totalReceita (SQL):  R$ 10.000,00
   totalDespesa (SQL):  R$ 2.500,00
   
7️⃣  COMPARAÇÃO: Backend vs Frontend
   ┌─ RECEITA
   │  Backend (SQL):   R$ 10.000,00
   │  Frontend (JS):   R$ 10.000,00
   │  Diferença:       R$ 0,00 ✅
   
   ├─ DESPESA
   │  Backend (SQL):   R$ 2.500,00
   │  Frontend (JS):   R$ 2.400,00
   │  Diferença:       R$ 100,00 ❌
```

---

## 🎬 CENÁRIOS POSSÍVEIS E SOLUÇÕES

### Cenário 1: ❌ Discrepância Encontrada (DESPESAS)

**Sintoma:** Script mostra `Diferença: R$ XX,XX ❌`

**Próximo Passo:**
1. Verificar seção "2️⃣ DESPESAS DETALHADAS POR TIPO"
2. Identificar qual tipo de despesa causa o problema
3. Implementar fix conforme a causa:

**Se o problema for:**
- **Taxas Plataforma:** Verificar se `obterDespesasAlocadas` está sendo aplicado inconsistentemente
- **Valores pequenos:** Implementar `toFixed(2)` no frontend ANTES de calcular soma
- **Status filtragem:** Adicionar filtro de status ao SQL ou ao frontend
- **CMV:** Verificar se há lógica especial de CMV que não está sendo aplicada

### Cenário 2: ✅ Sem Discrepância

**Sintoma:** Script mostra `Diferença: R$ 0,00 ✅`

**Próximo Passo:**
- Problema pode ter sido corrigido em versão anterior
- Testar em mais períodos
- Verificar se discrepância é intermitente

### Cenário 3: ❌ Discrepância TB em RECEITAS

**Sintoma:** Ambas receita e despesa diferem

**Próximo Passo:**
- Problema não é específico de despesas
- Pode ser timing issue (registros inseridos entre carregamentos)
- Verificar logs do servidor durante período

---

## 📝 FIX POSSÍVEL (Preliminar)

Com base na análise, aqui estão fixs potenciais:

### Fix 1: Padronizar Precisão Decimal (mais provável)

**Arquivo:** `backend/frontend/index.html`  
**Localização:** Computed property `resumoFiltrado` (linha ~2515)

```javascript
// ANTES
const totalDespesa = this.receitasFiltradas
  .filter(r => r.tipo === 'despesa')
  .reduce((acc, r) => {
    const valor = parseFloat(r.total) || 0;
    return acc + valor;
  }, 0);

// DEPOIS
const totalDespesa = this.receitasFiltradas
  .filter(r => r.tipo === 'despesa')
  .reduce((acc, r) => {
    const valor = Math.round(parseFloat(r.total) * 100) / 100 || 0;  // Arredondar para 2 casas
    return acc + valor;
  }, 0);
```

### Fix 2: Sincronizar Carregamento de Dados

**Arquivo:** `backend/frontend/index.html`  
**Localização:** Método `atualizarPeriodo()` (linha ~3118)

```javascript
// ANTES: carrega receitas COM 365 dias (sempre)
await this.carregarReceitas();

// DEPOIS: calcular exato número de dias para o período
async atualizarPeriodo() {
  const dias = this.calcularDiasDoPeriodo(this.periodo.dataInicio, this.periodo.dataFim);
  await this.carregarReceitas(dias);  // Passar dias específicos
}
```

### Fix 3: Adicionar Filtro de Status

Se a discrepância for causada por registros com `status = true`:

```javascript
// Na API listarFaturamentos:
WHERE data >= CURRENT_DATE - INTERVAL '${days} days'
AND status = false  // Ou adicionar parâmetro status
```

---

## 📊 TABELA DE TRACKING

| Data | Período Testado | Discrepância? | Causa Identificada | Fix Aplicado | Status |
|------|-----------------|---------------|-------------------|--------------|--------|
| 2026-05-08 | 2026-05-01 a 2026-05-08 | ❌ | Aguardando diagnóstico | Não | 🔍 |
|  |  |  |  |  |  |

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

### 1. Coletar Dados do Usuário

```bash
# Solicitar ao usuário que execute:
node backend/test-discrepancia-despesas.js --from 2026-05-XX --to 2026-05-XX
# E compartilhe a saída completa
```

### 2. Executar Diagnóstico Completo

```bash
# Uma vez com datas específicas:
node backend/test-discrepancia-despesas.js --from [dataDoUsuario] --to [dataDoUsuario]
```

### 3. Analisar Resultado

Com base na saída, identificar:
- [ ] Qual seção mostra a discrepância?
- [ ] Qual tipo de despesa está diferente?
- [ ] Há padrão (mesma quantidade sempre, valores específicos)?

### 4. Implementar Fix

Conforme a causa identificada (ver "Cenários Possíveis")

### 5. Testar

```bash
# Executar diagnóstico novamente após fix
node backend/test-discrepancia-despesas.js --from [mesmaData] --to [mesmaData]
# Verificar se diferença desapareceu
```

---

## 🔗 DOCUMENTOS RELACIONADOS

- [AUDITORIA_DISCREPANCIA_DESPESAS.md](./AUDITORIA_DISCREPANCIA_DESPESAS.md) - Análise técnica profunda
- [SESSION_7_RESUMO.md](./SESSION_7_RESUMO.md) - Fixes anteriores de timing
- [TESTE_FORMATACAO_TIMING_FIX.md](./TESTE_FORMATACAO_TIMING_FIX.md) - Testes relacionados

---

## 📌 NOTAS IMPORTANTES

⚠️ **Não mexer em:**
- Lógica de alocações de despesas (está funcionando corretamente)
- Cálculos de CMV (sistema separado)
- APIs de Taxas de Plataforma (específicas)

✅ **Focar em:**
- Diferença exclusivamente em despesas
- Filtro de data (inclusão/exclusão)
- Precisão decimal em JavaScript
- Timing de carregamento de dados

---

**Status:** 🔍 Aguardando diagnóstico com dados do usuário

**Estimativa de Resolução:** 2-4 horas (após coleta de dados)
