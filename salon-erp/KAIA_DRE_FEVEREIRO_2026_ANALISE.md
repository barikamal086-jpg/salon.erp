# 📊 ANÁLISE DRE KAIA — FEVEREIRO 2026

## 📈 RESUMO EXECUTIVO

| Métrica | Valor | % |
|---------|-------|---|
| **Receita Bruta** | R$ 247.313,65 | 100,0% |
| **Taxas Plataformas** | (R$ 43.706,78) | (17,7%) |
| **Receita Líquida** | R$ 203.606,87 | 82,3% |
| **CMV Total** | (R$ 52.163,80) | **25,6% RL** |
| **Margem Bruta** | R$ 151.443,07 | 61,2% |
| **Despesas Operacionais** | (R$ 92.755,41) | (37,5%) |
| **Resultado Operacional** | R$ 58.687,66 | **23,7%** |
| **Resultado Líquido** | R$ 54.187,66 | **21,9%** |

---

## 🎯 DESCOBERTAS CRÍTICAS PARA O SISTEMA CMV

### 1. RECEITA POR PLATAFORMA
```
iFood:        R$ 50.593,66 (20,5%)  — Taxa: 29,7% efetivo
99Food:       R$ 49.736,81 (20,1%)  — Taxa: 20,5% efetivo
Keeta Food:   R$ 41.956,50 (17,0%)  — Taxa: 44,1% efetivo ⚠️ RENEGOCIAR
Salão (Local):R$105.026,58 (42,5%)  — Sem taxa
```

**⚠️ INSIGHT**: Keeta com 44,1% de taxa é insustentável! Impacta diretamente a Receita Líquida.

### 2. CMV — 3 FONTES IDENTIFICADAS

**CMV Total Fevereiro: R$ 52.163,80 (25,6% de RL)**

#### ORIGEM DO CMV:

| Categoria | Valor | % RL | Fontes |
|-----------|-------|------|--------|
| **Carnes** | R$ 17.040,28 | 6,9% | BEEF + JS Prime + Cartões |
| **Bebidas** | R$ 12.167,50 | 4,9% | Ambev + HNK + FG7 |
| **Hortifruti** | R$ 10.094,70 | 4,1% | Maxis + RL Macedo + Mercado Vila + Cartões |
| **Laticínios** | R$ 4.641,25 | 1,9% | Campo Verde + Bela Pedra |
| **Padaria** | R$ 3.527,92 | 1,4% | Panetteria + Bella Buarque + Cartões |
| **Óleo** | R$ 1.800,00 | 0,7% | Real Safra |
| **Batata** | R$ 1.140,00 | 0,5% | Compras avulsas |
| **Embalagens** | R$ 1.009,65 | 0,4% | CA + G E F Embalagens |
| **Gelo** | R$ 742,50 | 0,3% | CPG Paulista |

### 3. DUPLICIDADES DETECTADAS E REMOVIDAS

| Fornecedor | Valor | Fonte 1 | Fonte 2 | Ação |
|-----------|-------|---------|---------|------|
| **BEEF Frigorífico** | R$ 7.119,00 | Conta Azul | Cartão | ✅ REMOVIDA |

**Impacto**: Sem remoção de duplicidade, CMV seria R$ 59.282,80 (29,1%) — acima da meta!

### 4. CARTÕES COMO FONTE DE CMV

**Itaú**: R$ 21.391 (classificado por categoria)
**Bradesco**: R$ 8.651 (classificado por categoria)

**⚠️ PROBLEMA ORIGINAL**: Esses cartões chegavam não classificados. O DRE "corrigido" teve que desmembrá-los manualmente:
- Carnes recebem dos cartões
- Hortifruti recebe dos cartões  
- Padaria recebe dos cartões
- Embalagens do Bradesco

### 5. IMPACTO DA RECLASSIFICAÇÃO

| Item | Antes | Depois | Diferença |
|------|-------|--------|-----------|
| CMV (valor) | R$ 45.739 | R$ 52.163,80 | +R$ 6.424,80 ❌ |
| CMV (%) | 18,5% RL | 25,6% RL | +7,1% ⚠️ |
| Marketing | Invisível | R$ 4.341,63 | +R$ 3.541 (novo) |
| Administrativo | Disperso | R$ 3.132,23 | +R$ 3.132 (consolidado) |
| **Resultado Op.** | +R$ 42.895 | +R$ 58.687 | +R$ 15.792 ✅ |

**CONCLUSÃO**: Classificação correta do CMV reduziu o lucro operacional em ~R$ 6.424, mas aumentou a precisão e confiabilidade dos dados.

---

## 🔧 REQUISITOS TÉCNICOS EXTRAÍDOS

### Para o CMVAnalyzer funcionar corretamente:

1. ✅ **Detectar duplicidades**
   - Mesmo fornecedor + valor similar + data (±3 dias)
   - Exemplo: BEEF em CA (12 fev) vs Cartão (14 fev)

2. ✅ **Reclassificar cartões não identificados**
   - Itaú R$ 21.391 → distribuir entre categorias
   - Bradesco R$ 8.651 → distribuir entre categorias
   - Usar palavra-chave do lançamento

3. ✅ **Calcular sobre Receita Líquida (não Bruta)**
   - RL = RB - Taxas de Plataforma
   - Fev: R$ 203.606,87 (não R$ 247.313,65)

4. ✅ **Meta configurável por restaurante**
   - KAIA meta: 22% (está em 25,6% = ACIMA)
   - Alerta: CMV acima da meta

5. ✅ **Comparativo mês anterior**
   - Janeiro: ?% (a receber)
   - Março: ? (a receber)

---

## 📊 PRÓXIMAS ANÁLISES NECESSÁRIAS

- [ ] DRE Janeiro 2026 (baseline)
- [ ] DRE Março 2026 (para validar padrão)
- [ ] Histórico de duplicidades (Jan, Fev, Mar)
- [ ] Movimentação dos cartões mensalmente
- [ ] Ajustes de Keeta (44,1% é insustentável)

---

**Versão**: KAIA_DRE_FEV_2026
**Data Análise**: 2026-04-17
**Status**: ✅ Pronto para arquitetura
