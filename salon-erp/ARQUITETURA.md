# 🏗️ ARQUITETURA DO PROJETO — Caixa360 ERP
> Documento permanente de referência — não alterar sem revisão
> Criado em: 02/05/2026
> Versão: 1.0

---

## 1. VISÃO GERAL DO PRODUTO

**Caixa360** é um ERP SaaS multi-tenant para gestão financeira de restaurantes e operações de delivery no Brasil.

**Proposta de valor:** Transformar dados financeiros dispersos (plataformas de delivery, fornecedores, PDV) em inteligência de negócio — especialmente o CMV real por canal de venda.

**Caso de validação:** KAIA Bar e Lanches (São Paulo) — operação com 4 canais: Salão, iFood, 99Food, Keeta.

---

## 2. MODELO DE NEGÓCIO

### Multi-tenant
- Cada cliente (restaurante) tem seus dados isolados
- Um único deploy serve múltiplos clientes
- Autenticação por cliente com dados segregados
- Planos futuros: Free / Pro / Enterprise

### Usuário típico
- Dono ou gestor de restaurante
- Sem conhecimento técnico avançado
- Acessa via browser (desktop e mobile)
- Recebe dados via WhatsApp, e-mail, plataformas

---

## 3. FONTES DE DADOS OFICIAIS

Esta é a arquitetura de entrada de dados do sistema. Toda informação financeira entra por uma dessas 5 fontes:

```
┌─────────────────────────────────────────────────────────┐
│                  FONTES DE DADOS                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. LANÇAMENTO MANUAL                                   │
│     → Receitas diárias por canal (Salão, iFood, etc)   │
│     → Despesas avulsas                                  │
│     → Interface: formulário no ERP                      │
│                                                         │
│  2. UPLOAD EXCEL (Conta Azul ou outro)                  │
│     → Receitas e despesas exportadas de fonte externa   │
│     → Formato: Excel (.xlsx)                            │
│     → Fluxo: exporta → upload no ERP → mapeamento auto │
│     → Regra: fonte externa envia Excel → ERP importa   │
│                                                         │
│  3. UPLOAD XML — Notas Fiscais de Entrada (NF-e)        │
│     → Compras de fornecedores com nota fiscal           │
│     → Formato: XML padrão SEFAZ                         │
│     → Fluxo: fornecedor envia XML → upload no ERP       │
│     → Extrai: fornecedor, CNPJ, valor, itens, data      │
│                                                         │
│  4. UPLOAD XML — Vendas Presenciais (PDV Consumer)      │
│     → Vendas do salão registradas no PDV                │
│     → Formato: XML do PDV Consumer                      │
│     → Extrai: itens vendidos, valor, forma de pagto     │
│     → Status: A IMPLEMENTAR                             │
│                                                         │
│  5. COMPROVANTE VIA CLAUDE (IA)                         │
│     → Pagamentos sem NF (PIX, transferência)            │
│     → Fluxo: usuário cola comprovante → Claude extrai   │
│              dados → lança no ERP automaticamente       │
│     → Status: IMPLEMENTADO                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Regra fundamental
> O ERP é a **fonte oficial** de todos os dados financeiros.
> Fontes externas (Conta Azul, PDV, etc) são **origens de importação** — não fontes de verdade.
> Após importado, o dado pertence ao ERP.

---

## 4. CANAIS DE VENDA

Cada lançamento no sistema pertence a um canal:

| Canal | Tipo | Taxa | Observação |
|---|---|---|---|
| Salão | Presencial | ~3% maquininha | Bebidas 99% presenciais |
| iFood | Delivery | ~35% (configurável) | Taxa lançada como despesa |
| 99Food | Delivery | ~30% (configurável) | Taxa lançada como despesa |
| Keeta | Delivery | ~52% (configurável) | Taxa lançada como despesa |
| WhatsApp/PIX | Delivery próprio | 0% | Sem taxa de plataforma |

### Como as taxas são registradas
Cada plataforma gera dois lançamentos:
```
Receita bruta → tipo = 'receita', categoria = 'iFood'
Taxa da plataforma → tipo = 'despesa', categoria = 'iFood', subcategoria = 'Taxas'

Receita Líquida = Receita Bruta − Taxa da Plataforma
```

---

## 5. CLASSIFICAÇÃO DE DESPESAS

Hierarquia de classificação — tabela `tipo_despesa`:

```
CMV — Custo de Mercadoria Vendida
├─ Hortifruti     → Vegetais, frutas, verduras
├─ Padaria        → Pão, massas, derivados
├─ Óleo           → Óleos e gorduras
├─ Batata         → Batatas e tubérculos
├─ Carne          → Carnes, peixes, proteínas
└─ Embalagem      → Embalagens e descartáveis

Operacional
├─ Aluguel        → Aluguel do estabelecimento
├─ Utilidades     → Água, luz, gás
├─ Limpeza        → Materiais de limpeza
└─ Manutenção     → Manutenção e reparos

Administrativa
├─ Impostos       → Impostos e taxas
├─ Pessoal        → Salários e encargos
└─ Software       → Ferramentas e sistemas

Financeira
├─ Juros          → Juros e multas
└─ Taxas          → Taxas bancárias e plataformas
```

### Regra de CMV
> Apenas despesas com `classificacao = 'CMV'` entram no cálculo do CMV%.
> Salários, aluguel e impostos NUNCA entram no CMV.

---

## 6. LÓGICA DO CMV INTELIGENTE

### Fórmula base
```
Receita Líquida = Receita Bruta − Taxas da Plataforma
CMV% = CMV_total ÷ Receita_Líquida × 100
```

### Alocação proporcional por canal
A cozinha é compartilhada — os insumos são comprados para o Salão
mas servem todos os canais. A alocação é proporcional:

```
proporcao_canal = receita_liquida_canal ÷ receita_liquida_total
cmv_canal = cmv_total × proporcao_canal
```

### Regra das bebidas
> Bebidas são 99% consumidas no Salão.
> CMV de bebidas NÃO é alocado para canais de delivery.
> Bebidas ficam 100% no Salão.

### O que o CMV revela
```
Keeta:  usuário fica com ~40% de cada R$1 vendido
Salão:  usuário fica com ~82% de cada R$1 vendido
```
A taxa de plataforma é o principal destruidor de margem — não o CMV.

---

## 7. ARQUITETURA TÉCNICA

### Stack
```
Frontend:  Vue.js + HTML/CSS (Single Page Application)
Backend:   Node.js + Express.js
Banco:     PostgreSQL (Railway)
Deploy:    Railway (auto-deploy via GitHub)
IA:        Anthropic Claude API (agente de análise)
```

### Estrutura do banco de dados
```sql
-- Lançamentos financeiros (core do sistema)
faturamento (
  id, data, total, categoria, tipo,
  tipo_despesa_id, descricao, created_at
)

-- Classificação hierárquica de despesas
tipo_despesa (
  id, classificacao, subcategoria, descricao, ativa
)

-- Notas fiscais de entrada
notas_fiscais (
  id, numero_nf, fornecedor_nome, fornecedor_cnpj,
  data_emissao, valor_total, xml_content,
  tipo_despesa_id, faturamento_id, status
)

-- Canais/restaurantes (multi-tenant futuro)
restaurantes (
  id, nome, canal, ativa, cliente_id
)
```

### Infraestrutura Railway
```
Projeto: perfect-balance
Serviço backend: salon.erp → caixa360.up.railway.app
Serviço banco:   Postgres → postgres.railway.internal:5432
Branch deploy:   master (auto-deploy)
```

---

## 8. MÓDULOS DO SISTEMA

### Implementados ✅
| Módulo | Descrição |
|---|---|
| Dashboard | KPIs gerais, Performance por Categoria, Gráfico diário |
| Histórico | Lançamentos com filtros por período e categoria |
| CMV por Canal | CMV% alocado por canal com Margem Real |
| CMV Inteligente | Análise detalhada com breakdown por subcategoria |
| Notas Fiscais | Upload XML NF-e com extração automática |
| Auditoria CMV | Verificação e consistência dos dados |

### A implementar ⏳
| Módulo | Descrição | Prioridade |
|---|---|---|
| Agente AI | Análise automática em linguagem natural | Alta |
| Import Excel | Upload Excel Conta Azul com mapeamento | Alta |
| PDV Consumer | Upload XML de vendas presenciais | Média |
| CMV Teórico vs Real | Comparar fichas técnicas com compras | Média |
| Evolução Histórica | Tendência do CMV% mês a mês | Média |
| Multi-tenant | Isolamento por cliente | Alta |
| Autenticação | Login por cliente | Alta |
| Relatórios PDF | Export de relatórios | Baixa |

---

## 9. MAPEAMENTO EXCEL CONTA AZUL → ERP

| Coluna Conta Azul | Campo ERP | Observação |
|---|---|---|
| Data de competência | data | Formato DD/MM/AAAA |
| Descrição | descricao | Texto livre |
| Nome do fornecedor/cliente | fornecedor | Para despesas |
| Valor (R$) | total | Negativo = despesa |
| Categoria 1 | tipo_despesa | Mapeamento automático |
| Código de referência | ref_externa | Chave anti-duplicata |

### Mapeamento de categorias
| Conta Azul | ERP classificacao | ERP subcategoria |
|---|---|---|
| Hortifruti | CMV | Hortifruti |
| Bebidas | CMV | Embalagem |
| Carne | CMV | Carne |
| Padaria | CMV | Padaria |
| Óleo | CMV | Óleo |
| Embalagem / Descartáveis | CMV | Embalagem |
| Gelo | CMV | Embalagem |
| Laticinios | CMV | Hortifruti |
| Freelancer / Salario | Administrativa | Pessoal |
| Aluguel | Operacional | Aluguel |
| Água e Saneamento | Operacional | Utilidades |
| Energia Elétrica | Operacional | Utilidades |
| Gas | Operacional | Utilidades |
| Impostos / IPTU | Administrativa | Impostos |
| Taxas iFood | Financeira | Taxas (categoria=iFood) |
| Taxa 99food | Financeira | Taxas (categoria=99Food) |
| Keeta Food | Financeira | Taxas (categoria=Keeta) |
| prolabore / Dividendos | Administrativa | Pessoal |

---

## 10. REGRAS DE NEGÓCIO CRÍTICAS

1. **CMV% sempre sobre Receita Líquida** — nunca Receita Bruta
2. **Taxas de plataforma** são lançadas como despesa na própria categoria do canal
3. **Bebidas** ficam 100% no Salão — não alocadas para delivery
4. **Salários, impostos e aluguel** NÃO entram no CMV
5. **Dashboard DRE ≠ CMV** — módulos separados com lógicas diferentes
6. **Anti-duplicata** — toda importação verifica chave única antes de inserir
7. **ERP é a fonte oficial** — fontes externas são apenas origens de importação
8. **Benchmark CMV%** — meta abaixo de 30%, alerta acima de 35%
9. **Margem Real mínima** — meta acima de 50% por canal
10. **Bebidas no Salão** — CMV de bebidas calculado sobre preço direto (sem taxa)

---

## 11. AGENTE AI — CAIXA360 AI

### Comportamento
- Analista financeiro especializado em restaurantes delivery Brasil
- Recebe dados reais do período selecionado
- Responde em linguagem natural, como consultor direto
- Máximo 250 palavras por análise
- Sempre em português brasileiro

### Output padrão
1. Ponto mais crítico identificado
2. Causa provável
3. 3 recomendações práticas
4. 1 pergunta para aprofundar

### Fases de implementação
```
Fase 1 — Reativo (botão "Analisar com IA" nas telas)
Fase 2 — Proativo (alertas automáticos no fechamento do mês)
Fase 3 — Memória histórica (tendências e sazonalidade)
```

---

## 12. ROADMAP

### Curto prazo (próximas 2 semanas)
- [ ] Import Excel Conta Azul funcionando
- [ ] Agente AI Fase 1
- [ ] CMV por Canal estável e validado

### Médio prazo (próximo mês)
- [ ] Upload XML PDV Consumer
- [ ] CMV Teórico vs Real
- [ ] Multi-tenant básico (isolamento por cliente_id)

### Longo prazo (3-6 meses)
- [ ] Autenticação completa
- [ ] Onboarding de novos clientes
- [ ] App mobile
- [ ] Relatórios exportáveis PDF/Excel

---

*Documento de arquitetura — Caixa360 ERP — v1.0 — 02/05/2026*
