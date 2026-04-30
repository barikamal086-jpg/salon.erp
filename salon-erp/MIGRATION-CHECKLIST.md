# ✅ CHECKLIST: Migração SQLite → PostgreSQL

## 📋 PRÉ-MIGRAÇÃO (Código Pronto)

- [x] Novo `database.js` com PostgreSQL criado
- [x] Script de migração criado: `migrate-sqlite-to-postgres.js`
- [x] Guia de setup Railway: `RAILWAY-POSTGRESQL-SETUP.md`
- [x] Dependências instaladas (pg, dotenv)
- [x] Commit feito: `b1b89b6`

**Status:** Código pronto. Aguardando setup no Railway.

---

## 🔧 CONFIGURAÇÃO NO RAILWAY (Você precisa fazer)

- [ ] **1.1** Acessar https://railway.app/dashboard
- [ ] **1.2** Selecionar projeto `salon.erp`
- [ ] **1.3** Criar novo serviço PostgreSQL
- [ ] **1.4** Aguardar ~2 minutos (banco criado)
- [ ] **1.5** Copiar `DATABASE_URL` do PostgreSQL
- [ ] **1.6** Adicionar `DATABASE_URL` em variáveis do backend
- [ ] **1.7** Desconectar PostgreSQL de conexões automáticas

**Status:** ⏳ Pendente seu setup manual

---

## 🏠 MIGRAÇÃO LOCAL (Depois do Railway estar pronto)

**Arquivo:** `.env` no `backend/`

Copiar e colar (seu DATABASE_URL do Railway):
```
DATABASE_URL=postgresql://user:password@host:5432/salon_erp_db
```

Então executar:
```bash
cd backend/
node migrate-sqlite-to-postgres.js
```

Deve mostrar:
```
✅ PostgreSQL conectado
✅ Validação passou - Dados íntegros!
```

- [ ] **2.1** Criar arquivo `.env` com DATABASE_URL
- [ ] **2.2** Executar script de migração
- [ ] **2.3** Verificar output: dados migrados com sucesso
- [ ] **2.4** Verificar: TODOS os dados de abril aparecem

**Status:** ⏳ Depois de Railway estar pronto

---

## 🚀 DEPLOY PARA RAILWAY

Após migração local funcionar perfeitamente:

```bash
git push origin master
```

Railway fará rebuild com PostgreSQL.

- [ ] **3.1** Fazer push do código
- [ ] **3.2** Aguardar Railway rebuild (~3 min)
- [ ] **3.3** Verificar logs do Railway para `✅ PostgreSQL conectado`
- [ ] **3.4** Testar dashboard em produção

**Status:** ⏳ Depois da migração local funcionar

---

## ✅ VALIDAÇÃO FINAL

Após tudo em produção:

```
⏰ Tempo: ~15 minutos total

1. Acessar dashboard
2. Vá em "CMV por Canal"
3. Verifique dados de ABRIL:
   ✅ Salão: R$ 96.785,94
   ✅ iFood: R$ 56.389,25
   ✅ 99Food: R$ 43.070,09
   ✅ Keeta: R$ 59.726,36
   ✅ TOTAL: R$ 255.971,64
4. EDITE um valor
5. Aguarde 2-3 minutos
6. RECARREGUE página
7. Verifique se valor PERSISTIU
```

- [ ] **4.1** Dados de abril aparecem completos
- [ ] **4.2** Edição persiste após recarregar
- [ ] **4.3** Sem mais mensagens de "dados perdidos"
- [ ] **4.4** CMV Analysis funciona com dados corretos

**Status:** ⏳ Depois do deploy

---

## 📞 Próximas Ações

Após marcar ✅ em **tudo**:

1. **Avise** que migração está 100% completa
2. Vou validar os números de abril sobreviveram
3. Confirmar que bug está resolvido
4. Começar Phase 2: Multi-tenant com autenticação

---

## 🆘 Se Algo Der Errado

Refer ao `RAILWAY-POSTGRESQL-SETUP.md` seção **Troubleshooting** ou avise com:
- Mensagem de erro exata
- O que estava fazendo quando ocorreu
- Screenshot dos logs do Railway
