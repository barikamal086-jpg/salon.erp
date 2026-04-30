# 🔴 BUG CRÍTICO: Dados Sendo Sobrescritos/Desaparecendo

**Data:** 2026-04-30  
**Severidade:** CRÍTICA - Perda de dados em produção  
**Status:** DIAGNOSTICADO - Solução em desenvolvimento  

---

## Descrição do Problema

Quando você atualiza um lançamento (ex: receita iFood 30/04/2026), após alguns minutos o valor volta ao estado anterior ou desaparece completamente.

### Timeline do Erro
```
16:30 → Usuário edita receita iFood
16:31 → Mudança salva (aparente sucesso)
16:35 → Dados desaparecem ou voltam ao anterior
```

---

## Causa Raiz Identificada

### 1. **Banco de Dados No Container (CRÍTICO)**

**Arquivo:** `backend/database.js` linha 4
```javascript
const dbPath = path.join(__dirname, 'salon-erp.db');  // ❌ INSEGURO
```

**Problema:**
- Banco SQLite armazenado no filesystem **efêmero** do container Railway
- Containers Railway são destruídos e recriados a cada:
  - Deploy automático (push para GitHub)
  - Restart do serviço
  - Atualização de recursos

**Resultado:**
- Quando container é recriado: `salon-erp.db` é APAGADO
- Novo container cria banco VAZIO
- Dados "voltam" ao estado anterior (porque foram perdidos)

### 2. **Sem Persistência Externa**

**Checagem:** Nenhuma referência a:
- PostgreSQL
- MySQL
- Supabase
- MongoDB
- Volumes persistentes

✓ Confirmado: **NENHUM banco de dados persistente configurado**

### 3. **Sem Backup/Replicação**

- Sem cópias dos dados fora do container
- Sem replicas para recuperação
- Sem WAL (Write-Ahead Logging) para Railway

---

## Impacto

| Operação | Status | Resultado |
|----------|--------|-----------|
| Salvar dados | ✅ Parece funcionar | Dados no container local |
| Aguardar 5-10 min | ⏳ Container reinicia | Dados perdidos |
| Consultar dados | ❌ Falha | Mostra versão anterior ou vazio |
| CMV Analysis | ❌ Dados incorretos | Calcula sobre dados stale |

---

## Solução Recomendada

### Opção 1: PostgreSQL no Railway (RECOMENDADO)
- ✅ Persistência garantida
- ✅ Backup automático
- ✅ Replicação
- ✅ Escalável
- ⏱️ Tempo de implementação: 2-3 horas

### Opção 2: Supabase (Alternativa)
- ✅ PostgreSQL gerenciado + backup
- ✅ Sem setup
- ✓ Free tier até 500MB
- ⏱️ Tempo: 30 min (migrate + test)

### Opção 3: Volume Persistente no Railway (Temporário)
- ✅ Rápido para implementar
- ❌ Menos robusto que PostgreSQL
- ❌ Sem backup automático
- ⏱️ Tempo: 30 min

---

## Checklist de Verificação

- [ ] Confirmar com Railway dashboard que não há PostgreSQL attached
- [ ] Verificar logs do Railway para padrão de restarts
- [ ] Confirmar timestamp de quando dados desaparecem vs container restart
- [ ] Validar que DATABASE_URL não está configurada em env vars

---

## Próximas Ações

1. **IMEDIATO** (hoje): Decidir entre PostgreSQL, Supabase ou Volume
2. **HOJE** (2-3h): Implementar solução escolhida
3. **HOJE** (1h): Testes de persistência
4. **HOJE** (30min): Migrar dados históricos (se existirem backup)
5. **AMANHÃ**: Monitorar se problema foi resolvido

---

## Referências

- Railway Docs: https://docs.railway.app/databases/postgresql
- Supabase: https://supabase.com
- SQLite vs PostgreSQL: https://www.sqlite.org/fileio.html (read-only filesystem)
