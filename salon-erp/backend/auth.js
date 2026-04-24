const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('./utils/logger');

// Chave secreta (em produção, use variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'kaia-erp-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

// Simular usuários (em produção, seria no banco de dados)
// Para agora, vamos hardcodear os sócios
const USUARIOS = [
  {
    id: 1,
    email: 'younes@kaia.com',
    nome: 'Younes',
    senha_hash: hashPassword('younes123'),
    role: 'admin'
  },
  {
    id: 2,
    email: 'bruno@kaia.com',
    nome: 'Bruno',
    senha_hash: hashPassword('bruno123'),
    role: 'admin'
  },
  {
    id: 3,
    email: 'kamal@kaia.com',
    nome: 'Kamal',
    senha_hash: hashPassword('kamal123'),
    role: 'admin'
  }
];

// Hash de senha simples (em produção, usar bcrypt)
function hashPassword(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

// Verificar senha
function verificarSenha(senhaDigitada, hashArmazenado) {
  const hashDigitado = hashPassword(senhaDigitada);
  return hashDigitado === hashArmazenado;
}

// Gerar JWT
function gerarToken(usuario) {
  const payload = {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    role: usuario.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verificar JWT
function verificarToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, payload: decoded };
  } catch (error) {
    logger.error(`Erro ao verificar token: ${error.message}`);
    return { valid: false, error: error.message };
  }
}

// Buscar usuário por email
function buscarUsuarioPorEmail(email) {
  return USUARIOS.find(u => u.email === email);
}

// Middleware de autenticação
function middlewareAutenticacao(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token não fornecido'
    });
  }

  const resultado = verificarToken(token);

  if (!resultado.valid) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }

  // Adicionar usuário ao request
  req.usuario = resultado.payload;
  next();
}

module.exports = {
  gerarToken,
  verificarToken,
  verificarSenha,
  buscarUsuarioPorEmail,
  middlewareAutenticacao,
  USUARIOS,
  JWT_SECRET
};
