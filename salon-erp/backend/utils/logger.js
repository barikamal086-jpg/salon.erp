const fs = require('fs');
const path = require('path');

// Diretório de logs
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Caminho do arquivo de log
const getLogFile = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logsDir, `salon-erp-${today}.log`);
};

// Formatar timestamp
const getTimestamp = () => {
  return new Date().toISOString();
};

// Escrever no arquivo de log
const writeLog = (message, level = 'INFO') => {
  const timestamp = getTimestamp();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;

  try {
    fs.appendFileSync(getLogFile(), logEntry);
  } catch (error) {
    console.error('Erro ao escrever no log:', error.message);
  }
};

// Exports
module.exports = {
  info: (message) => {
    writeLog(message, 'INFO');
  },

  error: (message) => {
    writeLog(message, 'ERROR');
    // Em produção, também logar erro
    if (process.env.NODE_ENV === 'production') {
      // Adicionar notificação aqui se necessário
    }
  },

  warning: (message) => {
    writeLog(message, 'WARN');
  },

  debug: (message) => {
    // Só logar debug se não for produção
    if (process.env.NODE_ENV !== 'production') {
      writeLog(message, 'DEBUG');
    }
  },

  success: (message) => {
    writeLog(message, 'SUCCESS');
  }
};
