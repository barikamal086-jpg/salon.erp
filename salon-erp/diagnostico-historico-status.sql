-- 🔍 DIAGNÓSTICO: Por que Histórico está faltando R$ 683,92 em despesas?

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONTEXTO
-- ═══════════════════════════════════════════════════════════════════════════════
-- KPI mostra: R$ 9.401,93 em despesas
-- Histórico mostra: R$ 8.718,01 em despesas (soma manual)
-- Diferença: R$ 683,92 (EXATAMENTE o mesmo que estava faltando antes!)
-- Período: Últimos 30 dias

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1️⃣  VERIFICAR STATUS DO TIPO DE DADOS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'faturamento' AND column_name = 'status';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2️⃣  VER DISTRIBUIÇÃO DE STATUS PARA DESPESAS (últimos 30 dias)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  status,
  pg_typeof(status) as tipo,
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY status
ORDER BY status;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3️⃣  DESPESAS POR TIPO DE STATUS (discriminado)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  CASE
    WHEN status = false THEN 'BOOLEAN FALSE'
    WHEN status = 'f' THEN 'STRING f'
    WHEN status = true THEN 'BOOLEAN TRUE'
    WHEN status = 't' THEN 'STRING t'
    ELSE 'OUTRO'
  END as statusTipo,
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '30 days'
  AND tipo = 'despesa'
GROUP BY status;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4️⃣  QUERY DO KPI (COM AMBOS OS FILTROS)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '30 days'
  AND tipo = 'despesa'
  AND (status = false OR status = 'f');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5️⃣  QUERY DO HISTÓRICO (SEM FILTRO DE STATUS - deveria ser tudo)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '30 days'
  AND tipo = 'despesa';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6️⃣  VER TODOS OS REGISTROS DE DESPESA (últimos 30 dias) - DETALHADO
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  id,
  data,
  categoria,
  total,
  status,
  pg_typeof(status) as status_tipo,
  enviado_em,
  CASE
    WHEN status = false THEN 'BOOLEAN FALSE'
    WHEN status = 'f' THEN 'STRING f'
    WHEN status = true THEN 'BOOLEAN TRUE'
    WHEN status = 't' THEN 'STRING t'
    ELSE 'OUTRO'
  END as status_label
FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '30 days'
  AND tipo = 'despesa'
ORDER BY data DESC, total DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7️⃣  COMPARAÇÃO: Qual registros faltam?
-- ═══════════════════════════════════════════════════════════════════════════════

-- Despesas com status = true ou 't' (enviadas/processadas?)
SELECT
  COUNT(*) as despesas_enviadas,
  SUM(total) as total_despesas_enviadas
FROM faturamento
WHERE data >= CURRENT_DATE - INTERVAL '30 days'
  AND tipo = 'despesa'
  AND (status = true OR status = 't');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8️⃣  INTERPRETAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════════

/*

Se Query 4 (KPI com false e 'f') = R$ 9.401,93
E Query 5 (Histórico sem filtro) = R$ X

Então:
- Se X = R$ 8.718,01: Significa há R$ 683,92 em despesas com status = true ou 't'
- Se X = R$ 9.401,93: Significa o Histórico está trazendo tudo OK, problema é no frontend

*/
