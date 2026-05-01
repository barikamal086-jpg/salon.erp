const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('./database'); // Inicializa o banco de dados

const apiRoutes = require('./routes/api');
const debugRoutes = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 5006;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Servir frontend estático
const frontendPath = path.join(__dirname, './frontend');
app.use(express.static(frontendPath));

// Rotas API
app.use('/api', apiRoutes);

// Rotas DEBUG
app.use('/debug', debugRoutes);

// Rota raiz (serve index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Fallback para SPA - serve index.html para rotas não encontradas no static
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada'
  });
});

// Iniciar servidor com timeout aumentado para uploads grandes
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
  console.log(`📊 API disponível em http://0.0.0.0:${PORT}/api/faturamentos`);
  console.log(`🐘 PostgreSQL pool inicializado\n`);
});

// Aumentar timeout para 5 minutos (300 segundos) para uploads grandes
server.timeout = 300000;
server.keepAliveTimeout = 310000;

module.exports = app;
