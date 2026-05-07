-- Encontrar o registro Keeta com taxa errada
SELECT 
  id, 
  data, 
  total, 
  categoria, 
  tipo,
  tipo_despesa_id
FROM faturamento
WHERE categoria = 'Keeta'
  AND tipo = 'despesa'
  AND total > 1000  -- Valores muito altos (pois está armazenado errado)
ORDER BY data DESC, total DESC
LIMIT 10;
