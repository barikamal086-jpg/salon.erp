/**
 * Sistema Profissional de Error Handling
 * Retorna erros estruturados, descritivos e acionáveis
 *
 * Tipos de Erro:
 * - VALIDATION_ERROR (400) - Campo obrigatório, formato inválido, valor fora do range
 * - NOT_FOUND (404) - Recurso não existe
 * - UNAUTHORIZED (401) - Token inválido/expirado, usuário sem permissão
 * - CONFLICT (409) - Recurso já existe, duplicado, estado conflitante
 * - SERVER_ERROR (500) - Erro interno, falha no banco de dados
 * - RATE_LIMITED (429) - Limite de requisições excedido
 */

class AppError extends Error {
  constructor(message, code, statusCode = 400, details = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// ============================================
// FACTORY FUNCTIONS - Fácil criar erros
// ============================================

const ErrorTypes = {
  // ❌ VALIDAÇÃO (400)
  MISSING_FIELD: (fieldName) => new AppError(
    `Campo obrigatório: "${fieldName}"`,
    'MISSING_FIELD',
    400,
    { field: fieldName, hint: `Envie ${fieldName} no corpo da requisição` }
  ),

  INVALID_FORMAT: (fieldName, expected) => new AppError(
    `Formato inválido: "${fieldName}"`,
    'INVALID_FORMAT',
    400,
    { field: fieldName, expected, hint: `Esperado: ${expected}` }
  ),

  INVALID_VALUE: (fieldName, value, allowedValues) => new AppError(
    `Valor inválido: "${fieldName}" = "${value}"`,
    'INVALID_VALUE',
    400,
    { field: fieldName, value, allowed: allowedValues, hint: `Permitidos: ${allowedValues.join(', ')}` }
  ),

  VALUE_OUT_OF_RANGE: (fieldName, min, max, value) => new AppError(
    `Valor fora do intervalo: "${fieldName}" = ${value}`,
    'VALUE_OUT_OF_RANGE',
    400,
    { field: fieldName, value, min, max, hint: `Deve estar entre ${min} e ${max}` }
  ),

  DUPLICATE: (fieldName, value) => new AppError(
    `Já existe: "${fieldName}" = "${value}"`,
    'DUPLICATE',
    409,
    { field: fieldName, value, hint: `Use um valor único para ${fieldName}` }
  ),

  // ❌ AUTENTICAÇÃO (401)
  INVALID_TOKEN: () => new AppError(
    'Token inválido ou expirado',
    'INVALID_TOKEN',
    401,
    { hint: 'Faça login novamente para obter um novo token' }
  ),

  MISSING_TOKEN: () => new AppError(
    'Token não fornecido',
    'MISSING_TOKEN',
    401,
    { hint: 'Envie o token no header: Authorization: Bearer <token>' }
  ),

  UNAUTHORIZED: (reason = 'Acesso negado') => new AppError(
    reason,
    'UNAUTHORIZED',
    401,
    { hint: 'Você não tem permissão para acessar este recurso' }
  ),

  // ❌ NÃO ENCONTRADO (404)
  NOT_FOUND: (resource, id) => new AppError(
    `${resource} não encontrado: ID ${id}`,
    'NOT_FOUND',
    404,
    { resource, id, hint: `Verifique se o ${resource} existe` }
  ),

  RESOURCE_NOT_FOUND: (resourceName) => new AppError(
    `${resourceName} não encontrado`,
    'NOT_FOUND',
    404,
    { resource: resourceName, hint: `Nenhum ${resourceName} corresponde ao critério` }
  ),

  // ❌ CONFLITO (409)
  STATE_CONFLICT: (reason) => new AppError(
    `Conflito de estado: ${reason}`,
    'STATE_CONFLICT',
    409,
    { hint: 'O recurso está em um estado inválido para esta operação' }
  ),

  // ❌ SERVIDOR (500)
  DATABASE_ERROR: (operation, details = '') => new AppError(
    `Erro ao ${operation} no banco de dados`,
    'DATABASE_ERROR',
    500,
    { operation, details, hint: 'Tente novamente mais tarde. Se persistir, contate o administrador' }
  ),

  SERVER_ERROR: (message, details = '') => new AppError(
    message || 'Erro interno do servidor',
    'SERVER_ERROR',
    500,
    { details, hint: 'Tente novamente mais tarde' }
  ),

  EXTERNAL_API_ERROR: (service, statusCode, details) => new AppError(
    `Erro ao conectar com ${service}`,
    'EXTERNAL_API_ERROR',
    503,
    { service, statusCode, details, hint: `Serviço ${service} pode estar indisponível` }
  ),

  // ❌ RATE LIMITING (429)
  RATE_LIMITED: (retryAfter) => new AppError(
    'Limite de requisições excedido',
    'RATE_LIMITED',
    429,
    { retryAfter, hint: `Tente novamente em ${retryAfter} segundo(s)` }
  ),
};

// ============================================
// MIDDLEWARE - Tratador de erros global
// ============================================

function errorHandler(err, req, res, next) {
  // Se é um AppError, retornar estruturado
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        timestamp: err.timestamp,
        details: Object.keys(err.details).length > 0 ? err.details : undefined,
        // Para debug (remover em produção)
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    });
  }

  // Se é um erro genérico do Node/Express
  console.error('❌ [UNCAUGHT ERROR]', err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'Erro inesperado no servidor',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      details: {
        hint: 'Contate o administrador se o problema persistir'
      },
      ...(process.env.NODE_ENV === 'development' && {
        originalError: err.message,
        stack: err.stack
      })
    }
  });
}

// ============================================
// VALIDADORES - Helpers para validar inputs
// ============================================

const Validators = {
  // Validar campos obrigatórios
  requireFields: (obj, fields, resourceName = 'Entrada') => {
    const missing = fields.filter(f => !obj[f] || obj[f] === '');
    if (missing.length > 0) {
      throw ErrorTypes.MISSING_FIELD(missing[0]);
    }
  },

  // Validar um valor é do tipo esperado
  requireType: (value, type, fieldName) => {
    if (typeof value !== type) {
      throw ErrorTypes.INVALID_FORMAT(fieldName, type);
    }
  },

  // Validar enum (lista de valores permitidos)
  requireEnum: (value, allowedValues, fieldName) => {
    if (!allowedValues.includes(value)) {
      throw ErrorTypes.INVALID_VALUE(fieldName, value, allowedValues);
    }
  },

  // Validar número em range
  requireRange: (value, min, max, fieldName) => {
    if (value < min || value > max) {
      throw ErrorTypes.VALUE_OUT_OF_RANGE(fieldName, min, max, value);
    }
  },

  // Validar email
  requireEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ErrorTypes.INVALID_FORMAT('email', 'exemplo@dominio.com');
    }
  },

  // Validar data
  requireDate: (date) => {
    if (isNaN(new Date(date).getTime())) {
      throw ErrorTypes.INVALID_FORMAT('data', 'YYYY-MM-DD');
    }
  },

  // Validar número positivo
  requirePositive: (value, fieldName) => {
    if (value <= 0 || isNaN(value)) {
      throw ErrorTypes.INVALID_VALUE(fieldName, value, ['número positivo']);
    }
  },
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  AppError,
  ErrorTypes,
  errorHandler,
  Validators
};
