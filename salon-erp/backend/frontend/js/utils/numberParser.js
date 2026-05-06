/**
 * Parser de números em formato brasileiro
 * Converte formatos como "36.315,20" para 36315.20
 *
 * Aceita:
 * - "36.315,20" → 36315.20
 * - "36315,20"  → 36315.20
 * - "36.315"    → 36315 (sem decimais)
 * - "36315"     → 36315
 * - "36,20"     → 36.20
 * - 36315.20    → 36315.20 (já é número)
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
  let value = input.trim();

  // Se está vazio, retornar 0
  if (value === '' || value === null) {
    return 0;
  }

  // Lógica para detectar separador de milhar e decimal:
  // Se tem múltiplos pontos, o primeiro é milhar
  // Se tem ponto E vírgula: ponto = milhar, vírgula = decimal
  // Se tem só vírgula: é decimal
  // Se tem só ponto no final: pode ser decimal

  // Remover pontos que são separadores de milhar
  // Estratégia: se há vírgula, tudo que vem antes dela com ponto é milhar
  if (value.includes(',')) {
    // Tem vírgula, então ela é o separador decimal
    // Remove todos os pontos (são separadores de milhar)
    value = value.replace(/\./g, '');
    // Troca vírgula por ponto para parseFloat funcionar
    value = value.replace(/,/g, '.');
  } else if (value.lastIndexOf('.') > 0 && value.length - value.lastIndexOf('.') > 3) {
    // Tem ponto mas não tem vírgula, e tem mais de 3 dígitos após o ponto
    // Isso significa que o ponto é separador de milhar (ex: "36.315.00")
    // Remover todos os pontos
    value = value.replace(/\./g, '');
  } else if (value.includes('.') && !value.includes(',')) {
    // Tem ponto mas não tem vírgula
    // Se há menos de 3 dígitos após o ponto, é decimal
    // Caso contrário, são todos pontos de milhar
    const parts = value.split('.');
    if (parts[parts.length - 1].length <= 2) {
      // Parece ser decimal (ex: "36.20")
      // Mas se há múltiplos pontos, remover todos
      if (parts.length > 2) {
        value = value.replace(/\./g, '');
      }
      // Do nothing - ponto final é decimal
    } else {
      // Mais de 2 dígitos após ponto, é milhar
      value = value.replace(/\./g, '');
    }
  }

  // Converter para número
  const result = parseFloat(value);

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
