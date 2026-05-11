-- 🔍 SCRIPT DE DIAGNÓSTICO: Incompatibilidade de Tipo de Status
-- Execute este script para confirmar a causa da discrepância de R$ 683,92

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONTEXTO
-- ═══════════════════════════════════════════════════════════════════════════════
-- Total correto: R$ 165.280,87 (95 registros)
-- Discrepância: R$ 683,92
-- Período: Abril 2026

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1️⃣  VERIFICAR TIPO DE DADOS NO BANCO
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'faturamento' AND column_name = 'status';

-- Resultado esperado:
-- column_name | data_type | is_nullable
-- ────────────┼───────────┼─────────────
-- status      | boolean   | YES

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2️⃣  VER QUAIS VALORES ESTÃO NO BANCO PARA STATUS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  status,
  COUNT(*) as num_registros,
  pg_typeof(status) as tipo_postgres
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
GROUP BY status
ORDER BY status;

-- Resultado esperado:
-- status | num_registros | tipo_postgres
-- ───────┼───────────────┼──────────────
-- f      | XX            | boolean
-- t      | YY            | boolean
-- (ou FALSE/TRUE dependendo de como PostgreSQL exibe)

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3️⃣  QUERY A: KPI USA (status = false)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa_soComFalse
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
  AND tipo = 'despesa'
  AND status = false;

-- Resultado esperado: Provavelmente algo < R$ 165.280,87

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4️⃣  QUERY B: SE BANCO REALMENTE TEM STRING 'f'
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa_comStringF
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
  AND tipo = 'despesa'
  AND status::text = 'f';

-- Resultado esperado: Pode encontrar registros se houver coerção de tipo

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5️⃣  QUERY C: HISTÓRICO USA (SEM FILTRO)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa_semFiltro
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
  AND tipo = 'despesa';

-- Resultado esperado: R$ 165.280,87 ✅

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6️⃣  QUERY D: COMPARAÇÃO COMPLETA
-- ═══════════════════════════════════════════════════════════════════════════════

-- Mostrar diferença entre false e 't'
SELECT
  CASE WHEN status = false THEN 'false' ELSE 't' END as statusTipo,
  COUNT(*) as num_registros,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as totalDespesa
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
  AND tipo = 'despesa'
GROUP BY status;

-- Resultado esperado: Mostrar registros com false vs t, e qual soma falta

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7️⃣  QUERY E: VER TODOS OS REGISTROS DE ABRIL (DETALHADO)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  id,
  data,
  tipo,
  status,
  total,
  categoria
FROM faturamento
WHERE data >= '2026-04-01' AND data <= '2026-04-30'
  AND tipo = 'despesa'
ORDER BY status, total DESC;

-- Resultado esperado: Ver todos os 95 registros com seus status

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8️⃣  QUERY F: COMPARAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════════════════════

WITH despesas_abril AS (
  SELECT
    COUNT(*) as totalRegistros,
    SUM(total) as totalDespesa,
    COUNT(CASE WHEN status = false THEN 1 END) as comFalse,
    COUNT(CASE WHEN status = true THEN 1 END) as comTrue,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as comNull,
    SUM(CASE WHEN status = false THEN total ELSE 0 END) as somaFalse,
    SUM(CASE WHEN status = true THEN total ELSE 0 END) as somaTrue,
    SUM(CASE WHEN status IS NULL THEN total ELSE 0 END) as somaNulo
  FROM faturamento
  WHERE data >= '2026-04-01' AND data <= '2026-04-30'
    AND tipo = 'despesa'
)
SELECT
  '─── RESUMO ABRIL ───' as info,
  totalRegistros as "Total de Registros",
  totalDespesa as "Total Despesa (correto)",
  comFalse as "Registros com status=false",
  comTrue as "Registros com status=true",
  comNull as "Registros com status=NULL",
  somaFalse as "Soma com false",
  somaTrue as "Soma com true",
  somaNulo as "Soma com NULL"
FROM despesas_abril;

-- ═══════════════════════════════════════════════════════════════════════════════
-- INTERPRETAÇÃO DOS RESULTADOS
-- ═══════════════════════════════════════════════════════════════════════════════

/*

Se Query C (SEM FILTRO) = R$ 165.280,87 ✅
E Query A (status = false) < R$ 165.280,87

Então:
  Diferença = R$ 165.280,87 - R$ de Query A

EXEMPLOS:

Se Query A = R$ 164.597,00 então:
  R$ 165.280,87 - R$ 164.597,00 = R$ 683,92
  └─ Significa há R$ 683,92 em registros com status != false

Se Query A = R$ 0,00 então:
  └─ Significa TODOS os registros têm status != false (provavelmente STRING 'f')

Se Query A = R$ 165.280,87 então:
  └─ KPI está OK! Discrepância está em outro lugar

*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DO DIAGNÓSTICO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Execute todas as queries acima e envie os resultados para diagnosticar
-- a causa exata da discrepância
