-- 🔍 DIAGNÓSTICO: Por que Dashboard 99Food não sincroniza

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1️⃣  VERIFICAR ÚLTIMA ENTRADA EDITADA DE 99FOOD
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  id,
  data,
  tipo,
  categoria,
  total,
  status,
  created_at,
  updated_at,
  (CURRENT_TIMESTAMP - updated_at) as tempo_desde_edicao
FROM faturamento
WHERE categoria = '99Food'
ORDER BY updated_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2️⃣  TOTAL 99FOOD (RECEITA)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as num_receitas,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa,
  COUNT(DISTINCT data) as dias
FROM faturamento
WHERE categoria = '99Food' AND tipo = 'receita';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3️⃣  TAXAS DE 99FOOD (COMO DESPESA TIPO 'Taxas')
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  id,
  data,
  tipo,
  categoria,
  total,
  (SELECT subcategoria FROM tipo_despesa WHERE id = f.tipo_despesa_id) as subcategoria,
  status,
  updated_at
FROM faturamento f
WHERE categoria = '99Food' AND tipo = 'despesa'
ORDER BY updated_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4️⃣  QUERY EXATA QUE O BACKEND USA: obterStatsPorCategoria()
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  'Salão' as categoria,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa,
  COUNT(DISTINCT data) as dias
FROM faturamento
WHERE categoria = 'Salão' AND status = false
UNION ALL
SELECT
  'iFood' as categoria,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa,
  COUNT(DISTINCT data) as dias
FROM faturamento
WHERE categoria = 'iFood' AND status = false
UNION ALL
SELECT
  'Keeta' as categoria,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa,
  COUNT(DISTINCT data) as dias
FROM faturamento
WHERE categoria = 'Keeta' AND status = false
UNION ALL
SELECT
  '99Food' as categoria,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa,
  COUNT(DISTINCT data) as dias
FROM faturamento
WHERE categoria = '99Food' AND status = false;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5️⃣  QUERY DESPESAS ALOCADAS: obterDespesasAlocadas()
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  '99Food' as categoria,
  SUM(CASE WHEN tipo = 'despesa' AND categoria = '99Food' THEN total ELSE 0 END) as totalDespesa,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) -
  SUM(CASE WHEN tipo = 'despesa' AND categoria = '99Food' THEN total ELSE 0 END) as totalLiquido,
  SUM(CASE WHEN tipo = 'despesa' AND categoria = 'Salão' AND tipo_despesa_id IS NOT NULL THEN total * 0.25 ELSE 0 END) as totalTaxas
FROM faturamento
WHERE status = false;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6️⃣  VERIFICAR O PERÍODO ATUAL DO DASHBOARD
-- ═══════════════════════════════════════════════════════════════════════════════

-- Assumindo período de últimos 30 dias (padrão)
-- Se hoje é 2026-05-11, período deve ser 2026-04-11 a 2026-05-11

SELECT
  CURRENT_DATE - INTERVAL '30 days' as dataInicio,
  CURRENT_DATE as dataFim,
  CURRENT_DATE - INTERVAL '30 days' || ' a ' || CURRENT_DATE as periodo;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7️⃣  99FOOD DENTRO DO PERÍODO DOS ÚLTIMOS 30 DIAS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as total_registros,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa,
  MIN(data) as primeira_data,
  MAX(data) as ultima_data
FROM faturamento
WHERE categoria = '99Food'
  AND status = false
  AND data >= CURRENT_DATE - INTERVAL '30 days'
  AND data <= CURRENT_DATE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHECKLIST DE DIAGNÓSTICO
-- ═══════════════════════════════════════════════════════════════════════════════

/*

Execute cada query e anote os resultados:

Query 1: ÚLTIMA ENTRADA EDITADA
- ID da última edição: ___
- Timestamp updated_at: ___
- Tempo desde edição: ___

Query 2: TOTAL 99FOOD RECEITA
- Número de receitas: ___
- Total receita: R$ ___
- Total despesa: R$ ___
- Dias: ___

Query 3: TAXAS 99FOOD
- Quantas despesas (taxas): ___
- Qual é o total? R$ ___
- Data da última edição: ___

Query 4: STATS POR CATEGORIA (EXATA)
- 99Food totalReceita: R$ ___
- 99Food totalDespesa: R$ ___
- 99Food dias: ___

Query 5: DESPESAS ALOCADAS
- 99Food totalDespesa: R$ ___
- 99Food totalLiquido: R$ ___

Query 7: 99FOOD NOS ÚLTIMOS 30 DIAS
- Total receita: R$ ___
- Total despesa: R$ ___
- Está no período? SIM/NÃO

ANÁLISE:
- Se Query 4 mostra valor diferente de Query 7 → problema na query
- Se Query 1 mostra updated_at recente mas Query 4 tem valor antigo → problema é cache
- Se Query 4 retorna NULL/0 para 99Food → entrada não está no banco

*/
