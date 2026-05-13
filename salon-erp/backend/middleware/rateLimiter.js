const rateLimit = require('express-rate-limit');

/**
 * Configurações de Rate Limiting para ERP
 * Protege contra DDoS, brute force e abuso de API
 */

// 🔐 LOGIN: Muito restritivo - 5 tentativas por minuto por IP
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5, // máximo 5 requisições
  message: {
    success: false,
    error: '❌ Muitas tentativas de login. Tente novamente em 1 minuto.'
  },
  standardHeaders: true, // Retorna info de limite em `RateLimit-*` headers
  legacyHeaders: false, // Desabilita `X-RateLimit-*` headers
  keyGenerator: (req, res) => {
    // Rate limit por IP ou por user ID se autenticado
    return req.body?.email || req.ip;
  },
  skip: (req, res) => {
    // Skip em desenvolvimento
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    console.warn(`⚠️ [LOGIN] Rate limit atingido para: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Muitas tentativas de login. Aguarde 1 minuto antes de tentar novamente.'
    });
  }
});

// 📊 API GERAL: Moderado - 100 requisições por minuto por IP
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100,
  message: 'Limite de requisições excedido. Máximo 100 por minuto.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    console.warn(`⚠️ [API] Rate limit atingido para: ${req.ip} - Rota: ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Limite de requisições excedido. Tente novamente mais tarde.'
    });
  }
});

// 📤 UPLOAD: Restritivo - 10 uploads por hora por IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: 'Limite de uploads excedido. Máximo 10 por hora.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    console.warn(`⚠️ [UPLOAD] Rate limit atingido para: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Limite de uploads excedido. Máximo 10 por hora.'
    });
  }
});

// 🐛 DEBUG: Sem limite em dev, limite em prod
const debugLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Nunca skipa em produção
    return false;
  },
  handler: (req, res) => {
    console.warn(`⚠️ [DEBUG] Rate limit atingido para: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Limite de requisições de debug excedido.'
    });
  }
});

// 🔄 REFRESH TOKEN: Restritivo - 10 por minuto
const refreshTokenLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10,
  message: 'Limite de refresh token excedido.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    console.warn(`⚠️ [REFRESH TOKEN] Rate limit atingido para: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Muitas tentativas de refresh. Tente novamente em 1 minuto.'
    });
  }
});

// 📝 CRIAR RECURSO: Moderado - 50 criações por minuto
const createLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: 'Limite de criações excedido.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    return process.env.NODE_ENV === 'development';
  }
});

// ✏️ EDITAR RECURSO: Liberal - 200 edições por minuto
const updateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: 'Limite de edições excedido.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    return process.env.NODE_ENV === 'development';
  }
});

// 🗑️ DELETAR RECURSO: Muito restritivo - 20 deletions por minuto
const deleteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: 'Limite de deleções excedido.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    console.warn(`⚠️ [DELETE] Rate limit atingido para: ${req.ip} - Rota: ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Muitas deleções. Máximo 20 por minuto.'
    });
  }
});

module.exports = {
  loginLimiter,
  apiLimiter,
  uploadLimiter,
  debugLimiter,
  refreshTokenLimiter,
  createLimiter,
  updateLimiter,
  deleteLimiter
};
