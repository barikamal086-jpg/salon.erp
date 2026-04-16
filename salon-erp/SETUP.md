# 🚀 Guia de Setup - Salon ERP

## ⚙️ Pré-requisitos

Antes de começar, você precisa ter instalado:

### 1. Node.js (inclui npm)
- **Download:** https://nodejs.org/
- **Versão recomendada:** 16.x LTS ou superior
- **Verificar instalação:**
  ```bash
  node --version
  npm --version
  ```

Se ambos os comandos retornam versões, você está pronto!

---

## 📦 Instalação Passo a Passo

### Windows

#### Opção 1: PowerShell (Recomendado)

1. Abra **PowerShell** como Administrador
2. Navegue até a pasta do projeto:
   ```powershell
   cd "C:\Users\bari.NTMAD243\salon-erp\backend"
   ```

3. Instale as dependências:
   ```powershell
   npm install
   ```

4. Inicie o servidor:
   ```powershell
   npm start
   ```

Você verá a mensagem:
```
✅ Conectado ao SQLite: C:\...\salon-erp\backend\salon-erp.db
✅ Tabela "faturamento" pronta

🚀 Servidor rodando em http://localhost:5000
```

#### Opção 2: Prompt de Comando (CMD)

```cmd
cd C:\Users\bari.NTMAD243\salon-erp\backend
npm install
npm start
```

#### Opção 3: Visual Studio Code

1. Abra o VS Code
2. File → Open Folder → Selecione `salon-erp\backend`
3. Abra o Terminal integrado (Ctrl + `)
4. Execute:
   ```bash
   npm install
   npm start
   ```

---

### macOS / Linux

```bash
cd ~/salon-erp/backend
npm install
npm start
```

---

## ✅ Verificar Instalação

### 1. Confirmar que o servidor está rodando

Você deve ver no terminal:
```
✅ Conectado ao SQLite
✅ Tabela "faturamento" pronta
🚀 Servidor rodando em http://localhost:5000
```

### 2. Testar a API

Abra um novo terminal/PowerShell e execute:

```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri "http://localhost:5000/api/faturamentos" -Method GET

# macOS/Linux
curl http://localhost:5000/api/faturamentos
```

Você deve receber:
```json
{
  "success": true,
  "data": []
}
```

### 3. Abrir a Aplicação

Abra seu navegador e acesse:
```
http://localhost:5000
```

Você deve ver a interface do Salon ERP carregada!

---

## 📝 Estrutura de Pastas Confirmada

```
C:\Users\bari.NTMAD243\salon-erp\
├── backend/
│   ├── app.js                 ✅ Servidor Express
│   ├── database.js            ✅ Configuração SQLite
│   ├── models/
│   │   └── Faturamento.js     ✅ Queries SQL
│   ├── routes/
│   │   └── api.js             ✅ Endpoints REST
│   ├── package.json           ✅ Dependências
│   └── node_modules/          📦 (após npm install)
│
├── frontend/
│   ├── index.html             ✅ Layout
│   ├── css/
│   │   └── style.css          ✅ Estilos
│   └── js/
│       ├── app.js             ✅ Vue App
│       ├── utils/
│       │   └── api.js         ✅ Cliente HTTP
│       └── components/        ✅ Componentes Vue
│
├── README.md                  ✅ Documentação
└── SETUP.md                   ✅ Este arquivo
```

---

## 🧪 Testes Rápidos (Após Setup)

### Teste 1: Criar um Faturamento

Abra a aplicação em http://localhost:5000 e:

1. Preencha:
   - Data: 10/04/2024 (ou hoje)
   - Total: 1500
2. Clique "💾 Salvar"
3. Você deve ver:
   - ✅ Mensagem de sucesso
   - A receita aparece na tabela

### Teste 2: Editar Faturamento

1. Clique "✏️ Editar" na receita criada
2. Mude o total para 2000
3. Clique "Salvar"
4. O valor na tabela deve atualizar

### Teste 3: KPIs

1. Os cards de KPIs devem mostrar:
   - Total: R$ 2.000,00
   - Média: R$ 2.000,00
   - Maior: R$ 2.000,00
   - Menor: R$ 2.000,00
   - Dias: 1

### Teste 4: Gráfico

1. O gráfico deve mostrar um ponto no dia 10/04
2. Ao passar o mouse, deve exibir o valor

### Teste 5: Deletar Faturamento

1. Clique "🗑️ Deletar"
2. Confirme a exclusão
3. A receita desaparece da tabela

---

## 🚨 Troubleshooting

### Erro: "npm: command not found"

**Causa:** Node.js não está instalado ou PATH não está configurado

**Solução:**
1. Baixe Node.js: https://nodejs.org/
2. Execute o instalador
3. Reinicie o PowerShell/CMD
4. Verifique: `npm --version`

---

### Erro: "Cannot find module 'express'"

**Causa:** npm install não foi executado

**Solução:**
```bash
cd backend
npm install
```

---

### Erro: "EADDRINUSE: address already in use :::5000"

**Causa:** Porta 5000 já está sendo usada

**Solução 1:** Encerre o outro processo na porta 5000

**Solução 2:** Mude a porta no arquivo `backend/app.js`:
```javascript
const PORT = process.env.PORT || 5001; // Alterar 5000 → 5001
```

---

### Erro: "Cannot GET /api/faturamentos"

**Causa:** Servidor não está respondendo

**Solução:**
1. Confirme que o servidor está rodando (veja a mensagem no terminal)
2. Verifique que está acessando corretamente: http://localhost:5000
3. Reinicie o servidor: Ctrl+C e `npm start`

---

### Aplicação carrega mas não mostra dados

**Causa:** Frontend não consegue se conectar ao backend

**Solução:**
1. Abra o console do navegador (F12 → Console)
2. Procure por erros de CORS
3. Verifique se o servidor está rodando em http://localhost:5000

---

## 🎉 Próximos Passos

✅ **MVP pronto!** Agora você pode:

1. **Testar todas as funcionalidades**
2. **Fazer ajustes conforme necessário**
3. **Deploy em produção** (Railway, Heroku, etc.)
4. **Expandir para outros módulos** (Despesas, Notas Fiscais, etc.)

---

## 📞 Suporte Rápido

| Problema | Solução |
|----------|---------|
| Servidor não inicia | Verifique porta 5000 disponível |
| Frontend não carrega | Abra http://localhost:5000 (não localhost:3000) |
| API retorna erro | Verifique console do navegador (F12) |
| Dados não persistem | Verifique pasta backend/salon-erp.db existe |
| Gráfico não mostra | Recarregue a página (Ctrl+F5) |

---

**🚀 Parabéns! Seu Salon ERP está pronto para usar!**

Para mais informações, consulte o **README.md**
