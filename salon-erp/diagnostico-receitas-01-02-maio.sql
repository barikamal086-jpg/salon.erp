-- 🔍 DIAGNÓSTICO: Por que receitas de 01/05 e 02/05 não aparecem no KPI?

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONTEXTO
-- ═══════════════════════════════════════════════════════════════════════════════
-- Histórico mostra: Receitas de 01/05 e 02/05 ✅
-- KPI mostra: Nada desses dias ❌
-- Query do KPI: WHERE data >= ? AND data <= ? AND status = false

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1️⃣  VER TODOS OS REGISTROS DE 01/05 E 02/05
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  id,
  data,
  tipo,
  categoria,
  total,
  status,
  pg_typeof(status) as status_tipo,
  created_at
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02'
ORDER BY data DESC, created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2️⃣  CONTAR RECEITAS DE 01/05 E 02/05 (SEM FILTRO DE STATUS)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as total_registros,
  COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as num_receitas,
  COUNT(CASE WHEN tipo = 'despesa' THEN 1 END) as num_despesas,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3️⃣  DISTRIBUIÇÃO DE STATUS PARA ESSES DIAS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  status,
  pg_typeof(status) as status_tipo,
  COUNT(*) as num_registros,
  COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as num_receitas,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02'
GROUP BY status
ORDER BY status;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4️⃣  QUERY KPI EXATA (COM status = false)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalReceita,
  COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totalDespesa,
  COUNT(DISTINCT data) as dias,
  COUNT(*) as totalEntradas
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02' AND status = false;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5️⃣  QUERY HISTÓRICO EXATA (SEM FILTRO DE STATUS AGORA TEM FALSE)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as total_registros,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita
FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '30 days' AND status = false;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6️⃣  RECEITAS POR DIA (01/05 e 02/05) - DETALHADO
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  data,
  COUNT(*) as num_registros,
  COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as num_receitas,
  COUNT(CASE WHEN status = false THEN 1 END) as com_status_false,
  COUNT(CASE WHEN status = true THEN 1 END) as com_status_true,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as totalReceita,
  SUM(CASE WHEN tipo = 'receita' AND status = false THEN total ELSE 0 END) as receita_com_false
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02'
GROUP BY data
ORDER BY data DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7️⃣  VERIFICAR SE HÁ CACHE (UPDATED_AT)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  id,
  data,
  tipo,
  total,
  status,
  created_at,
  updated_at,
  (CURRENT_TIMESTAMP - updated_at) as tempo_desde_atualizacao
FROM faturamento
WHERE data >= '2026-05-01' AND data <= '2026-05-02'
ORDER BY updated_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8️⃣  COMPARAÇÃO: KPI vs HISTÓRICO vs BANCO
-- ═══════════════════════════════════════════════════════════════════════════════

WITH receitas_banco AS (
  SELECT SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as total
  FROM faturamento
  WHERE data >= '2026-05-01' AND data <= '2026-05-02'
),
receitas_kpi AS (
  SELECT SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as total
  FROM faturamento
  WHERE data >= '2026-05-01' AND data <= '2026-05-02' AND status = false
),
receitas_historico AS (
  SELECT SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as total
  FROM faturamento
  WHERE data >= '2026-05-01' AND data <= '2026-05-02' AND status = false
)
SELECT
  (SELECT total FROM receitas_banco) as "Banco Total",
  (SELECT total FROM receitas_kpi) as "KPI (status=false)",
  (SELECT total FROM receitas_historico) as "Histórico (status=false)",
  ((SELECT total FROM receitas_banco) - (SELECT total FROM receitas_kpi)) as "Diferença"
;

-- ═══════════════════════════════════════════════════════════════════════════════
-- INTERPRETAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════════

/*

Se Query 4 (KPI com status = false) retorna R$ 0,00 mas Query 2 (banco total) retorna algo > 0:
  → Receitas têm status ≠ false (provavelmente status = true ou STRING 'f'/'t')

Se Query 4 retorna algo mas Query 7 mostra updated_at muito recente:
  → Pode ser cache no Frontend (JavaScript não foi recarregado)

Se Query 6 mostra registros de 01/05 mas Query 4 mostra zero:
  → Definitivamente é status! Verificar Query 3 para ver distribuição

*/
