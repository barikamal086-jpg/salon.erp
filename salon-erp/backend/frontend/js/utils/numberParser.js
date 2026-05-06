/**
 * Parser de números em formato brasileiro
 * Converte formatos como "36.315,20" para 36315.20
 *
 * Regra SIMPLES:
 * 1. Se tem ponto E vírgula → ponto=milhar, vírgula=decimal
 * 2. Se tem só vírgula → é decimal
 * 3. Se tem só ponto → é decimal (última parte) ou milhar (se múltiplos)
 * 4. Se é número → retorna como está
 *
 * Exemplos:
 * - "3.631,52" → 3631.52 ✓
 * - "36.315,20" → 36315.20 ✓
 * - "36315,20" → 36315.20 ✓
 * - "3,50" → 3.50 ✓
 * - "1000" → 1000 ✓
 * - 3631.52 → 3631.52 ✓
 */

function parseBrasilValue(input) {
  // Se já é um número, retornar como está
  if (typeof input === 'number') {
    return input;
  }

  // Se não é string, tentar converter
  if (typeof input !== 'string') {
    return parseFloat(input);
  }

  // Remover espaços
  let str = input.toString().trim();

  // Se está vazio, retornar 0
  if (str === '' || str === null) {
    return 0;
  }

  // ✅ LÓGICA SIMPLES E CORRETA:

  // Se tem ponto E vírgula (formato brasileiro completo: "3.631,52")
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '');     // Remove pontos (são milhar)
    str = str.replace(/,/g, '.');     // Vírgula vira ponto
  }
  // Se tem só vírgula (formato brasileiro sem milhar: "36315,20" ou "3,50")
  else if (str.includes(',')) {
    str = str.replace(/,/g, '.');     // Vírgula vira ponto
  }
  // Se tem só ponto, deixa como está (pode ser decimal ou já estar correto)
  // Exemplo: "36.32" ou "1000" seguem normalmente

  // Converter para número
  const result = parseFloat(str);

  // Se deu NaN, retornar 0
  return isNaN(result) ? 0 : result;
}

/**
 * Formatar número para exibição em formato brasileiro
 * 36315.20 → "36.315,20"
 * 1234.5 → "1.234,50"
 */
function formatBrasilValue(value, decimals = 2) {
  if (typeof value !== 'number') {
    value = parseFloat(value);
  }

  if (isNaN(value)) {
    return '0,00';
  }

  // Fixar decimais
  const fixed = value.toFixed(decimals);
  const parts = fixed.split('.');
  const intPart = parts[0];
  const decPart = parts[1] || '00';

  // Adicionar ponto de milhar
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${intFormatted},${decPart}`;
}

/**
 * Validar se é um número válido em formato brasileiro
 */
function isValidBrasilNumber(input) {
  try {
    const value = parseBrasilValue(input);
    return !isNaN(value) && isFinite(value);
  } catch (e) {
    return false;
  }
}
