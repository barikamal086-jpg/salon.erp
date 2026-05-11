# 📋 Guia: Auditoria de Notas Fiscais Processadas

**Data:** 2026-05-11  
**Objetivo:** Verificar quantas notas foram processadas, quando, e se geraram faturamentos  
**Tempo Estimado:** 10 minutos

---

## 🎯 O Que Você Vai Fazer

1. **Executar queries SQL** para analisar o banco de dados
2. **Preencher um checklist** com os resultados
3. **Identificar anomalias** (notas não processadas, sem faturamento, etc)
4. **Gerar um relatório** com recomendações

---

## 📊 Arquivos

**Arquivo SQL:** `AUDITORIA_NOTAS_FISCAIS_2026-05-11.sql`
- 10 queries prontas para copiar e colar
- Cada query responde uma pergunta específica

---

## 🚀 Como Executar

### Passo 1: Abrir seu cliente PostgreSQL
- **pgAdmin** (web interface)
- **DBeaver** (aplicação desktop)
- **psql** (linha de comando)
- Ou qualquer outro cliente PostgreSQL

### Passo 2: Copiar e executar CADA query
**IMPORTANTE:** Execute UMA de cada vez, anotando os resultados

```
Query 1: RESUMO GERAL
↓ (execute e anote)
Query 2: NOTAS PENDENTES
↓ (execute e anote)
Query 3: NOTAS PROCESSADAS
... (continue até Query 10)
```

### Passo 3: Preencher o Checklist
No final do arquivo SQL há um checklist. Anote cada resultado.

---

## 📈 O Que Cada Query Responde

| Query | Pergunta | Por Quê Importante |
|-------|----------|-------------------|
| 1 | Quantas notas estão pendentes vs processadas? | Saber o status geral |
| 2 | Quais notas ainda faltam processar? | Identificar trabalho pendente |
| 3 | Quais foram processadas recentemente? | Ver o que foi concluído |
| 4 | Quando começaram a processar? | Timeline do processamento |
| 5 | Quantos faturamentos foram criados? | Validar que processou |
| 6 | Cada nota tem seu faturamento? | Detectar problemas de link |
| 7 | Há notas "órfãs"? | Encontrar anomalias |
| 8 | Status dos últimos 7 dias? | Análise recente |
| 9 | Totais gerais? | Resumo executivo |
| 10 | Validação cruzada | Sanidade check |

---

## 🔍 Interpretando os Resultados

### ✅ Tudo Processado (Esperado)
```
Query 1:
- status=pendente: 0 notas
- status=processado: 50+ notas
- Percentual: 100%

Ação: ✅ Tudo ok! Próximo passo: verificar se há anomalias em Query 7
```

### ⚠️ Parcialmente Processado
```
Query 1:
- status=pendente: 15 notas
- status=processado: 35 notas
- Percentual: 70%

Ação: ⚠️ 15 notas ainda faltam processar
  - Query 2 mostra quais
  - Verificar por quê não foram processadas
```

### ❌ Nada Processado
```
Query 1:
- status=pendente: 50 notas
- status=processado: 0 notas
- Percentual: 0%

Ação: ❌ CRÍTICO! Notas foram baixadas mas não processadas
  - Verificar se há erro no sistema
  - Processar manualmente via interface
```

### 🚨 Anomalia: Notas Sem Faturamento
```
Query 7:
- Notas processadas sem faturamento: 5 notas

Ação: 🚨 PROBLEMA! Essas 5 notas foram marcadas como "processadas"
      mas não geraram faturamentos
  - Pode ser um erro no processamento
  - Precisam ser reprocessadas
```

---

## 🎯 Checklist de Auditoria

Após executar todas as queries, preencha:

```
RESUMO GERAL
├─ [ ] Total de notas no sistema: ___
├─ [ ] Notas pendentes: ___
├─ [ ] Notas processadas: ___
└─ [ ] Percentual processado: ___%

NOTAS PENDENTES
├─ [ ] Quantas faltam processar: ___
├─ [ ] A mais antiga tem data: ___
└─ [ ] Valor total pendente: R$ ___

PROCESSAMENTO
├─ [ ] Primeira nota processada: ___
├─ [ ] Última nota processada: ___
└─ [ ] Data com mais processamentos: ___

FATURAMENTOS CRIADOS
├─ [ ] Total de faturamentos: ___
├─ [ ] Total receita: R$ ___
└─ [ ] Total despesa: R$ ___

ANOMALIAS
├─ [ ] Notas processadas mas sem faturamento: ___
├─ [ ] Se sim, quais IDs: ___
└─ [ ] Notas com erro: ___

ÚLTIMOS 7 DIAS
├─ [ ] Notas baixadas: ___
├─ [ ] Notas processadas: ___
└─ [ ] Taxa de processamento: ___%
```

---

## 🚦 Quando Cada Ação é Necessária

### ✅ Tudo OK
- 100% das notas processadas
- Todas têm faturamentos linkados
- Sem anomalias em Query 7

**Ação:** Nenhuma. Sistema está funcionando perfeitamente.

### ⚠️ Processo Incompleto (Normal)
- Algumas notas ainda pendentes
- Mas as processadas têm seus faturamentos

**Ação:** 
1. Processar as notas pendentes via interface
2. Monitorar se novas notas vêm sendo processadas

### ❌ Sem Processamento (Crítico)
- Muitas notas pendentes por dias
- Nenhuma foi processada

**Ação:**
1. Verificar se há erro no sistema
2. Checar logs de processamento
3. Reprocessar manualmente se necessário

### 🚨 Notas Órfãs (Problema)
- Query 7 mostra notas processadas sem faturamento

**Ação:**
1. Anote os IDs das notas órfãs
2. Verifique se houve erro no processamento
3. Reprocesse via interface (Delete → Reupload)

---

## 💡 Dicas

### Dica 1: Copiar Query Rapidamente
1. Abra o arquivo `AUDITORIA_NOTAS_FISCAIS_2026-05-11.sql`
2. Selecione a Query (ex: Query 1 até Query 2)
3. Ctrl+C para copiar
4. Ctrl+V no seu cliente PostgreSQL
5. Execute (Ctrl+Enter ou botão Run)

### Dica 2: Salvar Resultados
1. Execute cada query
2. Tire screenshot dos resultados
3. Ou copie para um documento de texto
4. Assim tem registro histórico

### Dica 3: Comparar com Execuções Anteriores
Se você executou essa auditoria antes, compare:
- Total de notas aumentou? (novas foram baixadas?)
- Percentual processado aumentou? (estão processando?)
- Há novas notas órfãs?

---

## 📞 Se Houver Problemas

### Problema 1: Query não funciona / erro SQL
**Solução:**
1. Verifique se está conectado ao banco correto
2. Copie exatamente do arquivo (sem espaços extras)
3. Se ainda não funcionar, compartilhe o erro exato

### Problema 2: Resultados vazios
**Solução:**
1. Pode ser que não haja notas no banco (nunca foram baixadas)
2. Ou todas foram deletadas
3. Execute Query 9 (TOTAIS) para confirmar

### Problema 3: Muitos resultados na Query 2 (>100 notas)
**Solução:**
1. Use `LIMIT 20` no final da query
2. Para ver apenas as 20 primeiras
3. Mude 20 para quantas você quer ver

---

## 📋 Modelo de Resposta

Quando executar a auditoria e quiser meu parecer, compartilhe assim:

```
AUDITORIA DE NOTAS FISCAIS - 2026-05-11

RESUMO:
- Total de notas: 50
- Pendentes: 5
- Processadas: 45 (90%)
- Valor total: R$ 125.000,00

STATUS:
- ✅ 90% processadas
- ⚠️ 5 notas ainda pendentes
- ✅ Nenhuma nota órfã detectada

RECOMENDAÇÃO:
Processar as 5 notas pendentes nos próximos 2 dias.
Caso contrário, solicitar ao fornecedor.

NOTAS PENDENTES:
(copie aqui os resultados de Query 2)
```

Com isso conseguirei fazer uma análise e dar recomendações específicas!

---

## ✅ Próximos Passos

1. ✏️ **Executar as 10 queries** (10 min)
2. 📝 **Preencher o checklist** (5 min)
3. 📤 **Compartilhar os resultados** comigo
4. 🎯 **Receber recomendações** baseado nos dados

---

**Arquivo para usar:** `AUDITORIA_NOTAS_FISCAIS_2026-05-11.sql`

Boa auditoria! 🚀

