-- 📊 AUDITORIA: Notas Fiscais Processadas vs Pendentes (2026-05-11)

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1️⃣  RESUMO GERAL: STATUS DAS NOTAS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  status,
  COUNT(*) as num_notas,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual,
  SUM(CASE WHEN valor_total IS NOT NULL THEN valor_total ELSE 0 END) as total_valor,
  MIN(data_emissao) as primeira_nota,
  MAX(data_emissao) as ultima_nota
FROM notas_fiscais
GROUP BY status
ORDER BY
  CASE WHEN status = 'pendente' THEN 1 ELSE 2 END;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2️⃣  DETALHES: NOTAS PENDENTES
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  id,
  numero_nf,
  fornecedor,
  data_emissao,
  data_vencimento,
  valor_total,
  status,
  created_at,
  (CURRENT_TIMESTAMP - created_at) as tempo_pendente
FROM notas_fiscais
WHERE status = 'pendente'
ORDER BY created_at ASC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3️⃣  DETALHES: NOTAS PROCESSADAS (ÚLTIMAS 20)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  id,
  numero_nf,
  fornecedor,
  data_emissao,
  valor_total,
  status,
  created_at,
  updated_at,
  (updated_at - created_at) as tempo_processamento
FROM notas_fiscais
WHERE status = 'processado'
ORDER BY updated_at DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4️⃣  TIMELINE: QUANDO FORAM PROCESSADAS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  DATE(updated_at) as data_processamento,
  COUNT(*) as num_notas_processadas,
  SUM(valor_total) as total_valor,
  MIN(numero_nf) as primeira_nf,
  MAX(numero_nf) as ultima_nf
FROM notas_fiscais
WHERE status = 'processado'
GROUP BY DATE(updated_at)
ORDER BY data_processamento DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5️⃣  FATURAMENTOS CRIADOS (RESULTADO DO PROCESSAMENTO)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as total_faturamentos,
  COUNT(DISTINCT DATE(created_at)) as dias_com_faturamentos,
  SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END) as total_receita,
  SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END) as total_despesa,
  MIN(created_at) as primeiro_faturamento,
  MAX(created_at) as ultimo_faturamento
FROM faturamento
WHERE created_at >= (SELECT MIN(created_at) FROM notas_fiscais WHERE status = 'processado')
  AND created_at <= (SELECT MAX(updated_at) FROM notas_fiscais WHERE status = 'processado');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6️⃣  VERIFICAÇÃO: NOTAS COM LINK PARA FATURAMENTOS
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  nf.id as nota_id,
  nf.numero_nf,
  nf.fornecedor,
  nf.valor_total as valor_nota,
  f.id as faturamento_id,
  f.total as total_faturamento,
  f.tipo,
  nf.status
FROM notas_fiscais nf
LEFT JOIN faturamento f ON f.nota_fiscal_id = nf.id
WHERE nf.status = 'processado'
ORDER BY nf.updated_at DESC
LIMIT 25;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7️⃣  ANÁLISE: NOTAS PROCESSADAS MAS SEM FATURAMENTO
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  nf.id,
  nf.numero_nf,
  nf.fornecedor,
  nf.valor_total,
  nf.status,
  nf.updated_at,
  (SELECT COUNT(*) FROM faturamento WHERE nota_fiscal_id = nf.id) as num_faturamentos
FROM notas_fiscais nf
WHERE nf.status = 'processado'
  AND NOT EXISTS (SELECT 1 FROM faturamento WHERE nota_fiscal_id = nf.id)
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8️⃣  ANÁLISE: NOTAS RECENTES (ÚLTIMOS 7 DIAS)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  DATE(created_at) as data_upload,
  COUNT(*) as num_notas,
  COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'processado' THEN 1 END) as processadas,
  SUM(CASE WHEN status = 'pendente' THEN valor_total ELSE 0 END) as valor_pendente,
  SUM(CASE WHEN status = 'processado' THEN valor_total ELSE 0 END) as valor_processado
FROM notas_fiscais
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY data_upload DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9️⃣  CONTAGEM: TOTAL GERAL
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT
  (SELECT COUNT(*) FROM notas_fiscais) as total_notas,
  (SELECT COUNT(*) FROM notas_fiscais WHERE status = 'pendente') as pendentes,
  (SELECT COUNT(*) FROM notas_fiscais WHERE status = 'processado') as processadas,
  (SELECT SUM(valor_total) FROM notas_fiscais) as valor_total_notas,
  (SELECT COUNT(*) FROM faturamento) as total_faturamentos,
  (SELECT SUM(total) FROM faturamento) as valor_total_faturamentos;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔟  CHECKLIST: VALIDAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════════

/*

EXECUTE CADA QUERY ACIMA E ANOTE OS RESULTADOS:

1️⃣  RESUMO GERAL
   - Total de pendentes: ___
   - Total de processadas: ___
   - Percentual processado: ___%
   - Valor total: R$ ___

2️⃣  NOTAS PENDENTES
   - Quantas aparecem? ___
   - Qual a mais antiga? ___

3️⃣  NOTAS PROCESSADAS
   - Quantas nos últimos 7 dias? ___
   - Tempo médio de processamento: ___

4️⃣  TIMELINE
   - Quando começaram a processar? ___
   - Qual foi a data com mais processamentos? ___

5️⃣  FATURAMENTOS CRIADOS
   - Total de registros criados: ___
   - Receita total: R$ ___
   - Despesa total: R$ ___

6️⃣  LINK NOTA → FATURAMENTO
   - Todas as notas processadas têm faturamento? ___

7️⃣  ANOMALIAS
   - Há notas processadas sem faturamento? ___
   - Se sim, quantas? ___

8️⃣  ÚLTIMOS 7 DIAS
   - Quantas notas foram baixadas? ___
   - Quantas foram processadas? ___
   - Valor não processado: R$ ___

9️⃣  TOTAIS
   - Proporção processada: __/__ = ___%

*/
