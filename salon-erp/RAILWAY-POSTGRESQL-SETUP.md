# 🚀 Setup PostgreSQL no Railway

## ⚠️ IMPORTANTE: Leia tudo antes de começar

Esta é a configuração crítica para resolver o bug de dados sendo perdidos.

---

## PASSO 1: Criar PostgreSQL no Railway Dashboard

1. Acesse: https://railway.app/dashboard
2. Selecione seu projeto `salon.erp`
3. Clique em **"+ New"** (canto superior)
4. Pesquise por **"PostgreSQL"**
5. Clique em **"PostgreSQL"** → **"Deploy"**

Aguarde ~2 minutos para o banco ser criado.

---

## PASSO 2: Obter DATABASE_URL

1. Na dashboard do Railway, clique no novo serviço **PostgreSQL**
2. Vá para a aba **"Variables"**
3. Copie o valor de `DATABASE_URL`
   - Formato: `postgresql://user:password@host:port/dbname`

---

## PASSO 3: Configurar variáveis de ambiente no Railway

1. Clique no serviço **salon-erp-backend** (seu app)
2. Vá para aba **"Variables"**
3. Clique em **"New Variable"**
4. **Name:** `DATABASE_URL`
5. **Value:** Cole o valor copiado do PostgreSQL
6. Clique **"Add"**

Outras variáveis (opcionais):
- `NODE_ENV`: `production`
- `LOG_LEVEL`: `info`

---

## PASSO 4: Desconectar PostgreSQL do backend (Railway)

⚠️ **IMPORTANTE**: Remova a conexão automática para evitar conflito de variáveis.

1. No seu projeto Railway
2. Clique em **"PostgreSQL"**
3. Vá para **"Connect"**
4. Veja "Connected services"
5. Se `salon-erp-backend` está conectado, clique em **"X"** para desconectar

Isso garante que VOCÊ controla a `DATABASE_URL` via variáveis.

---

## PASSO 5: Fazer deploy do código com PostgreSQL

### Opção A: Fazer push (Auto Deploy)

```bash
cd C:\Users\adm\Desktop\Claude\salon-erp
git add .
git commit -m "Migrate: SQLite → PostgreSQL"
git push origin master
```

Railway fará rebuild automaticamente.

### Opção B: Manual via CLI (se tiver railway CLI)

```bash
railway up
```

---

## PASSO 6: Validar que PostgreSQL está conectado

1. Vá para o dashboard do Railway
2. Clique em **salon-erp-backend**
3. Vá para **"Logs"**
4. Procure por: `✅ PostgreSQL conectado`

Se ver essa mensagem, está funcionando! 🎉

---

## PASSO 7: Migrar dados de SQLite (LOCAL APENAS)

⚠️ **Execute isto LOCALMENTE ANTES de fazer deploy**

```bash
cd C:\Users\adm\Desktop\Claude\salon-erp\backend
node migrate-sqlite-to-postgres.js
```

Este script:
- ✅ Lê dados do `salon-erp.db` (SQLite)
- ✅ Insere tudo no PostgreSQL do Railway
- ✅ Valida que tudo foi importado
- ✅ Mostra comparação SQLite vs PostgreSQL

Você deve ver:
```
✅ Validação passou - Dados íntegros!
```

---

## PASSO 8: Fazer novo push para Railway

Após migração funcionar localmente:

```bash
cd C:\Users\adm\Desktop\Claude\salon-erp
git add .
git commit -m "Data migration complete: SQLite → PostgreSQL"
git push origin master
```

Railway fará rebuild com os dados já no PostgreSQL.

---

## ✅ Verificação Final

Após tudo pronto:

1. Acesse a dashboard do seu ERP: http://localhost:5006 (local) ou seu Railway URL
2. Vá em "CMV por Canal"
3. Verifique os dados de **ABRIL 2026**:
   - Salão: R$ 96.785,94
   - iFood: R$ 56.389,25
   - 99Food: R$ 43.070,09
   - Keeta: R$ 59.726,36
   - **Total: R$ 255.971,64**
4. **Edite** um valor
5. **Aguarde 2-3 minutos**
6. **Recarregue** a página
7. Verifique se o valor **PERSISTIU** ✅

Se persistiu = Bug resolvido!

---

## 🐛 Troubleshooting

### Erro: "ECONNREFUSED" ao migrar

**Causa:** PostgreSQL não está pronto ou DATABASE_URL incorreta

**Solução:**
1. Aguarde 2-3 minutos após criar PostgreSQL
2. Verifique `DATABASE_URL` no Railway copiou correto
3. Teste conexão: `psql $DATABASE_URL`

### Erro: "relation does not exist"

**Causa:** Banco PostgreSQL foi criado mas tabelas não existem

**Solução:**
- Rode o backend uma vez para criar as tabelas:
```bash
npm start
```
- Aguarde ver `✅ Database inicializado`
- Ctrl+C para parar
- Rode migração novamente

### Dados não aparecem após migração

**Causa:** Conexão PostgreSQL não está usando a `DATABASE_URL` correta

**Solução:**
1. Verifique `DATABASE_URL` em `backend/.env`
2. Verifique `DATABASE_URL` no Railway (devem ser iguais)
3. Teste conexão local: `node -e "const { pool } = require('./database.js'); pool.query('SELECT 1').then(() => console.log('OK')).catch(e => console.error(e))"`

---

## 📚 Referências

- [Railway PostgreSQL Docs](https://docs.railway.app/databases/postgresql)
- [Node.js pg Module](https://node-postgres.com)
- [Environment Variables](https://docs.railway.app/develop/variables)

---

## ⏱️ Timeline Esperado

| Passo | Tempo |
|-------|-------|
| Criar PostgreSQL no Railway | 2-3 min |
| Configurar variáveis | 2 min |
| Push para Railway | 3-5 min |
| Migrar dados SQLite → Postgres | 2-3 min |
| **Total** | **~15 minutos** |

---

## ✨ Após Conclusão

- ✅ Dados persistem entre restarts
- ✅ Sem mais perda de dados
- ✅ Pronto para multi-cliente (Phase 2)
- ✅ Backups automáticos no Railway

**Avise quando terminar a migração — vou validar se os dados de abril sobreviveram! 🎉**
