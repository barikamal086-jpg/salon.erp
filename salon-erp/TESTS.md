# 🧪 Salon ERP - Plano de Testes

**Data Atual:** 2026-04-14  
**Ambiente:** localhost:5004  
**Status:** ✅ Pronto para testes

---

## 📋 Checklist de Testes

### 1️⃣ Dashboard - Período & KPIs
- [ ] Abrir app em http://localhost:5004
- [ ] Selecionar período: **01/04/2026 a 30/04/2026**
- [ ] Verificar KPIs aparecem:
  - [ ] Total Receita: deve estar > 0
  - [ ] Total Despesa: deve estar > 0
  - [ ] Saldo: Receita - Despesa
  - [ ] Média Diária Receita
  - [ ] Média Diária Despesa
- [ ] Clicar em "Últimos 7d" e "Últimos 30d" → valores devem mudar

---

### 2️⃣ Gráfico Tendência de Faturamento
**Esperado:** 2 linhas (verde=receita, vermelho=despesa)

- [ ] Período: **01/04/2026 a 30/04/2026**
- [ ] Gráfico carrega sem erros
- [ ] Legenda mostra:
  - [ ] "Receitas (R$)" em verde
  - [ ] "Despesas (R$)" em vermelho
- [ ] Linha verde (receitas) tem valores visíveis
- [ ] Linha vermelha (despesas) tem valores visíveis
- [ ] Eixo Y mostra valores em R$ (ex: "R$ 10.000")
- [ ] Eixo X mostra datas em formato DD/MM
- [ ] Hovering em um ponto mostra valores

**Debug:** Se vazio, rodar:
```bash
curl "http://localhost:5004/api/faturamentos/chart?from=2026-04-01&to=2026-04-30"
```
Deve retornar `"receita"` e `"despesa"` separados

---

### 3️⃣ Performance por Categoria
**Esperado:** Apenas 4 categorias (Salão, iFood, 99Food, Keepa)

- [ ] Período: **01/04/2026 a 30/04/2026**
- [ ] Carrega 4 cards com categoria
- [ ] NÃO aparecem fornecedores (BEEF, MAXIS, AMBEV, etc)
- [ ] Cada card mostra:
  - [ ] Receita total
  - [ ] Despesa total
  - [ ] Saldo líquido
  - [ ] Média e maior valor
  - [ ] Quantidade de dias

---

### 4️⃣ Upload e Processamento de Notas Fiscais

#### 4a. Upload XML/PDF
- [ ] Clicar em "Selecionar Arquivos"
- [ ] Selecionar uma nota fiscal (XML ou PDF)
- [ ] Arquivo deve aparecer na lista "Notas Pendentes"
- [ ] Status deve ser "pendente"

#### 4b. Selecionar Categoria e Processar
- [ ] Na nota pendente, selecionar categoria no dropdown (ex: "Bebidas")
- [ ] Clicar botão verde "✅ Processar"

---

### 5️⃣ Sugestão Inteligente de Data (CRÍTICO)

#### 5a. Data PASSADA (ex: 08/04/2026)
**Esperado:** Modal com aviso "Data Vencida" + campo customizado

- [ ] Nota com data 08/04/2026 (passada)
- [ ] Selecionar categoria
- [ ] Clicar "Processar"
- [ ] Modal aparece com:
  - [ ] ⚠️ "Esta nota venceu em 2026-04-08"
  - [ ] Campo "Data do lançamento" com valor 08/04/2026
  - [ ] Botão "Processar"
- [ ] Clicar "Processar"
- [ ] Nota desaparece de pendentes
- [ ] Aparecer em "Processadas (13)" com data 08/04/2026

#### 5b. Data FUTURA (ex: 17/04/2026)
**Esperado:** Modal com opções inteligentes "Lançar AGORA" e "FUTURO"

- [ ] Nota com data 17/04/2026 (futura)
- [ ] Selecionar categoria
- [ ] Clicar "Processar"
- [ ] Modal aparece com:
  - [ ] 💡 "Sugestão automática: 🟠 Lançar FUTURO"
  - [ ] Botão verde: "✅ Lançar AGORA" - 2026-04-14
  - [ ] Botão laranja: "📅 Lançar FUTURO" - 2026-04-17 (destacado)
  - [ ] Campo customização com data
- [ ] Clicar "Lançar FUTURO"
- [ ] Nota processada com data 17/04/2026

#### 5c. Data HOJE (14/04/2026)
**Esperado:** Modal com "Lançar AGORA" destacado

- [ ] Nota com data 14/04/2026 (hoje)
- [ ] Selecionar categoria
- [ ] Clicar "Processar"
- [ ] Modal mostra:
  - [ ] 💡 "Sugestão: 🟢 Lançar AGORA"
  - [ ] Botão verde destacado "✅ Lançar AGORA" - 2026-04-14
  - [ ] NÃO mostra opção "FUTURO"
- [ ] Clicar "Processar"
- [ ] Nota processada com data 14/04/2026

---

### 6️⃣ Tabela de Faturamentos

- [ ] Aparecem notas processadas
- [ ] Cada linha mostra: Data | Categoria | Total | Ações
- [ ] Botões funcionam:
  - [ ] ✏️ Editar → abre modal para alterar total
  - [ ] 🗑️ Deletar → pede confirmação e remove

---

### 7️⃣ CMV (Custo de Mercadoria Vendida)

#### 7a. Total CMV
```bash
curl "http://localhost:5004/api/faturamentos/cmv/total?from=2026-04-01&to=2026-04-30"
```
- [ ] Retorna `totalCMV`, `mediaCMV`, `maiorCMV`, `menorCMV`, `quantidadeCMV`, `diasComCMV`
- [ ] Valores são > 0 se houver itens CMV

#### 7b. CMV Detalhado
```bash
curl "http://localhost:5004/api/faturamentos/cmv/detalhado?from=2026-04-01&to=2026-04-30"
```
- [ ] Retorna array com subcategorias (Bebidas, Hortifruti, etc)
- [ ] Cada item tem: `subcategoria`, `total`, `media`, `maior`, `menor`, `quantidade`, `dias`

---

### 8️⃣ Consistência de Datas

**Teste Crítico:** Sempre usar período **01/04/2026 a 30/04/2026**

- [ ] Gráfico: mostra dados de 01/04 a 30/04
- [ ] KPIs: calculam para o mesmo período
- [ ] Performance por Categoria: usa o mesmo período
- [ ] CMV: usa o mesmo período
- [ ] Todos retornam os MESMOS valores consolidados

**Debug:** Se valores divergirem, rodar:
```bash
curl "http://localhost:5004/api/faturamentos/stats?from=2026-04-01&to=2026-04-30"
```

---

## 🐛 Bugs Conhecidos (Já Corrigidos)

| Bug | Status | Solução |
|-----|--------|---------|
| Datas passadas mostravam como futuras | ✅ | Parser lê dVenc de cobr.dup |
| Gráfico mostrava só receita | ✅ | 2 datasets no Chart.js |
| Categorias mostravam fornecedores | ✅ | WHERE IN ('Salão', ...) |
| Porta 5002 travada | ✅ | Migrou para 5004 |

---

## 📊 Dados de Teste

**Notas Fiscais Conhecidas:**
- BEEF FRIGORIFICO: venc 2026-04-10 (PASSADA)
- AMBEV S/A: venc 2026-04-08 (PASSADA)  
- MAXIS DISTRIBUIDORA: venc 2026-04-19 (FUTURA)
- URI OMMA KIMCHI: venc 2026-04-17 (FUTURA)

---

## ✅ Aprovação de Teste

**Data Teste:**  
**Testador:**  
**Resultado:** ✅ PASSOU / ❌ FALHOU  
**Observações:**  

---

## 🚀 Próximos Passos

Se todos os testes passarem:
1. ✅ Sistema estável
2. Pronto para:
   - [ ] Novos features
   - [ ] Integração com Conta Azul
   - [ ] Relatórios
   - [ ] Deploy

---

**Última atualização:** 2026-04-14  
**Versão do Projeto:** 1.0 Beta
