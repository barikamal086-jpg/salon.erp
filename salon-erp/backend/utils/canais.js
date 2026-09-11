/**
 * Canais de venda do Caixa360
 *
 * Cada canal é um valor granular armazenado em faturamento.categoria.
 * iFood e 99Food têm 2 lojas cada; Keeta e Salão têm loja única.
 *
 * Para agregações no dashboard (Performance por Categoria, rateio de CMV,
 * auditoria de alocação, taxas por plataforma) as lojas são somadas por
 * MARCA (grupo) — ver GRUPOS_CANAL / grupoDoCanal / SQL_GRUPO_CANAL.
 */

// Todos os canais granulares válidos (usado em validação de INSERT/UPDATE e nos
// dropdowns de Canal/Categoria do frontend)
const TODOS_CANAIS = [
  'Salão',
  'iFood Loja 1',
  'iFood Loja 2',
  '99Food Loja 1',
  '99Food Loja 2',
  'Keeta'
];

// Grupos (marcas) usados nos dashboards agregados
const GRUPOS_CANAL = ['Salão', 'iFood', '99Food', 'Keeta'];

// Mapa canal granular -> grupo/marca
const GRUPO_POR_CANAL = {
  'Salão': 'Salão',
  'iFood Loja 1': 'iFood',
  'iFood Loja 2': 'iFood',
  '99Food Loja 1': '99Food',
  '99Food Loja 2': '99Food',
  'Keeta': 'Keeta'
};

function grupoDoCanal(categoria) {
  return GRUPO_POR_CANAL[categoria] || categoria;
}

// Lista de canais formatada para uso direto em cláusulas SQL IN (...)
// Ex: `AND categoria IN (${SQL_TODOS_CANAIS})`
const SQL_TODOS_CANAIS = TODOS_CANAIS.map(c => `'${c}'`).join(', ');

// Fragmento SQL que agrupa um canal granular na sua marca. Usar como
// `${SQL_GRUPO_CANAL} as categoria` no SELECT — o Postgres permite GROUP BY
// / ORDER BY pelo alias resultante.
const SQL_GRUPO_CANAL = `CASE
    WHEN categoria IN ('iFood Loja 1', 'iFood Loja 2') THEN 'iFood'
    WHEN categoria IN ('99Food Loja 1', '99Food Loja 2') THEN '99Food'
    ELSE categoria
  END`;

// Mesmo fragmento, mas referenciando a coluna com prefixo de alias de tabela
// (ex: 'f.categoria' em queries com JOIN)
function sqlGrupoCanal(coluna = 'categoria') {
  return `CASE
    WHEN ${coluna} IN ('iFood Loja 1', 'iFood Loja 2') THEN 'iFood'
    WHEN ${coluna} IN ('99Food Loja 1', '99Food Loja 2') THEN '99Food'
    ELSE ${coluna}
  END`;
}

module.exports = {
  TODOS_CANAIS,
  GRUPOS_CANAL,
  GRUPO_POR_CANAL,
  grupoDoCanal,
  SQL_TODOS_CANAIS,
  SQL_GRUPO_CANAL,
  sqlGrupoCanal
};
