# 💅 Salon ERP - Módulo 1: Lançamento de Faturamento

Aplicação web profissional para gestão de faturamento de salões de beleza com integração ao Conta Azul Pro.

## 🎯 Funcionalidades

✅ **Lançamento de Receita** - Formulário para registrar faturamento diário  
✅ **Histórico com Tabela** - Visualizar últimos 30 dias com filtros  
✅ **Editar e Deletar** - Alterar totais ou remover registros  
✅ **5 KPIs Dinâmicos** - Total, Média, Maior, Menor, Dias do período  
✅ **Gráfico de Tendência** - Line chart interativo com Chart.js  
✅ **Filtro por Status** - Pendente | Enviado | Todos  
✅ **Integração Conta Azul** - Botão "Enviar ao Conta Azul"  
✅ **Responsivo** - Funciona em mobile e desktop  

## 🛠️ Requisitos

- **Node.js** 14+ (https://nodejs.org/)
- **npm** (vem com Node.js)

## 📦 Setup & Instalação

### 1. Clonar/Baixar o Projeto

```bash
cd salon-erp
```

### 2. Instalar Dependências Backend

```bash
cd backend
npm install
```

### 3. Iniciar o Servidor

```bash
npm start
# ou em modo desenvolvimento
npm run dev
```

Você verá:
```
✅ Conectado ao SQLite: C:\...\salon-erp\backend\salon-erp.db
✅ Tabela "faturamento" pronta

🚀 Servidor rodando em http://localhost:5000
📊 API disponível em http://localhost:5000/api/faturamentos
💾 Database: salon-erp.db
```

### 4. Acessar a Aplicação

Abra o navegador e acesse:
```
http://localhost:5000
```

## 📋 Estrutura do Projeto

```
salon-erp/
├── backend/
│   ├── app.js                    # Servidor Express
│   ├── database.js               # Configuração SQLite
│   ├── models/
│   │   └── Faturamento.js        # Queries e lógica de BD
│   ├── routes/
│   │   └── api.js                # Endpoints REST
│   ├── package.json
│   └── salon-erp.db              # Database SQLite
│
├── frontend/
│   ├── index.html                # Layout principal
│   ├── css/
│   │   └── style.css             # Estilos customizados
│   └── js/
│       ├── app.js                # Vue app principal
│       ├── utils/
│       │   └── api.js            # Cliente HTTP
│       └── components/
│           ├── FormLancamento.vue.js
│           ├── TabelaHistorico.vue.js
│           ├── KPIs.vue.js
│           └── GraficoTendencia.vue.js
│
└── README.md
```

## 🔌 API Endpoints

### GET `/api/faturamentos`
Lista faturamentos dos últimos N dias
```bash
# Últimos 30 dias (padrão)
GET /api/faturamentos

# Filtrar por status
GET /api/faturamentos?days=30&status=pending
GET /api/faturamentos?days=30&status=sent
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "data": "2024-04-10",
      "total": 1500.00,
      "status": 0,
      "enviado_em": null,
      "created_at": "2024-04-10 10:30:00"
    }
  ]
}
```

### POST `/api/faturamentos`
Criar novo faturamento
```bash
curl -X POST http://localhost:5000/api/faturamentos \
  -H "Content-Type: application/json" \
  -d '{"data":"2024-04-10","total":1500.00}'
```

### PUT `/api/faturamentos/:id`
Atualizar faturamento
```bash
curl -X PUT http://localhost:5000/api/faturamentos/1 \
  -H "Content-Type: application/json" \
  -d '{"total":1600.00}'
```

### DELETE `/api/faturamentos/:id`
Deletar faturamento
```bash
curl -X DELETE http://localhost:5000/api/faturamentos/1
```

### GET `/api/faturamentos/stats`
Obter KPIs do período
```bash
GET /api/faturamentos/stats?from=2024-03-10&to=2024-04-10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 15000.00,
    "media": 1500.00,
    "maior": 2000.00,
    "menor": 1000.00,
    "dias": 10
  }
}
```

### GET `/api/faturamentos/chart`
Obter dados para gráfico
```bash
GET /api/faturamentos/chart?from=2024-03-10&to=2024-04-10
```

### POST `/api/faturamentos/:id/enviar-conta-azul`
Marcar como enviado ao Conta Azul
```bash
curl -X POST http://localhost:5000/api/faturamentos/1/enviar-conta-azul
```

## 🗄️ Schema Database

```sql
CREATE TABLE faturamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data DATE UNIQUE NOT NULL,
  total DECIMAL(10,2) NOT NULL CHECK(total > 0),
  status BOOLEAN DEFAULT 0,
  enviado_em TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Índices:**
- `idx_data` - Ordenação por data (mais recente)
- `idx_status` - Filtragem por status
- `idx_created` - Ordenação por data de criação

## 💡 Como Usar

### 1. Lançar um Faturamento
1. Preencha a data (padrão: hoje)
2. Informe o total (em R$)
3. Clique "💾 Salvar"
4. O faturamento aparece na tabela com status "⏳ Pendente"

### 2. Editar Faturamento
1. Clique "✏️ Editar" na tabela
2. Altere o valor total
3. Clique "Salvar"

### 3. Deletar Faturamento
1. Clique "🗑️ Deletar" na tabela
2. Confirme a exclusão

### 4. Enviar ao Conta Azul
1. Clique "📤 Enviar" na tabela (apenas para pendentes)
2. Confirme
3. Status muda para "✅ Enviado"

### 5. Visualizar KPIs
1. Selecione o período (Data Início e Data Fim)
2. Os cards são atualizados automaticamente
3. O gráfico também atualiza

## 🔍 Troubleshooting

### "npm: command not found"
Instale Node.js de https://nodejs.org/

### "Cannot find module 'express'"
Execute `npm install` no diretório backend/

### Porta 5000 já em uso
Mude a porta em `backend/app.js`:
```javascript
const PORT = 5001; // Alterar aqui
```

### Banco de dados vazio
Apague `backend/salon-erp.db` e reinicie o servidor

## 📱 Responsividade

A aplicação é responsiva e funciona bem em:
- 📱 Mobile (375px e acima)
- 💻 Tablet (768px)
- 🖥️ Desktop (1280px e acima)

## 🚀 Deploy (Próximos Passos)

Para fazer deploy em produção:

1. **Railway.app** (recomendado):
   - Conectar repositório GitHub
   - Configurar variáveis de ambiente
   - Deploy automático

2. **Heroku**:
   - Criar `Procfile`
   - `git push heroku main`

3. **VPS/Servidor Próprio**:
   - Configurar PM2 para rodar Node
   - Usar Nginx como reverse proxy
   - SSL com Let's Encrypt

## 📝 Notas

- ✅ Usuário único por enquanto (sem autenticação)
- ✅ SQLite é suficiente para MVP (pode migrar para PostgreSQL)
- ✅ Integração Conta Azul usa skill existente (lancar-receitas)
- ✅ Todos os dados persistem no banco de dados local

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique o console do navegador (F12)
2. Verifique os logs do servidor
3. Consulte a documentação dos endpoints acima

---

**Desenvolvido com ❤️ para Kamal**  
Salon ERP v1.0.0 - MVP Module 1
