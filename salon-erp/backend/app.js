const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('./database'); // Inicializa o banco de dados

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5006;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Servir frontend estático
const frontendPath = path.join(__dirname, '../frontend');
console.log(`Frontend path: ${frontendPath}`);
app.use(express.static(frontendPath));

// Rotas API
app.use('/api', apiRoutes);

// Rota raiz (serve index.html)
app.get('/', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  console.log(`Serving index from: ${indexPath}`);
  res.sendFile(indexPath);
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

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
  console.log(`\n📊 API disponível em http://0.0.0.0:${PORT}/api/faturamentos`);
  console.log(`\n💾 Database: salon-erp.db\n`);
});

module.exports = app;
