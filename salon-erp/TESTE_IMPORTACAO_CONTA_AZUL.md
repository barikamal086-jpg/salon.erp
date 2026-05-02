# 📊 Teste de Importação Conta Azul

## Status Atual

✅ **Commits realizados:**
1. `f4d51cd` - CSV/Excel export feature
2. `3aaf114` - Allow Excel files in multer
3. `3530fe7` - Dedicated Excel multer instance

🔄 **Aguardando:** Redeploy do Railway (2-3 minutos)

---

## Teste 1: Importação via CLI

**Arquivo de Teste:** `conta-azul-test.xlsx` (8 linhas de teste)

**Comando:**
```bash
cd /c/Users/adm/Desktop/Claude/salon-erp
node backend/importar-conta-azul-cli.js ./conta-azul-test.xlsx https://caixa360.up.railway.app/api
```

**Esperado:**
- ✅ Importados: 8
- ⚠️ Duplicados: 0
- ❌ Erros: 0

**Dados de teste:**
- Aluguel: -R$ 2.500 → Operacional/Aluguel
- Bebidas: -R$ 450 → CMV/Bebidas
- Carne: -R$ 800 → CMV/Carne
- Energia: -R$ 350 → Operacional/Utilidades
- Salário: -R$ 3.000 → Administrativa/Pessoal
- Descartáveis: -R$ 150 → CMV/Embalagem
- Hortifruti: -R$ 300 → CMV/Hortifruti
- Taxas iFood: -R$ 250 → Financeira/Taxas

---

## Teste 2: Verificação de Notas Fiscais

Após importação, acessar:
https://caixa360.up.railway.app/#/processar-notas

**Esperado:**
- 8 notas com status = "pendente"
- Categorias auto-classificadas corretamente
- Poder visualizar e processar cada nota

---

## Teste 3: Export de Notas (CSV/Excel)

Na seção "Processar Notas Fiscais":

1. **CSV Export:**
   - Clique em "📊 Baixar CSV"
   - Arquivo: `notas-fiscais-YYYY-MM-DD.csv`
   - Verifique: cabeçalhos, formatação, quotes

2. **Excel Export:**
   - Clique em "📋 Baixar Excel"
   - Arquivo: `notas-fiscais-YYYY-MM-DD.xlsx`
   - Verifique: largura de colunas, formatação

---

## Teste 4: Processamento de Notas

Para cada nota importada:
1. Clique em "Processar" ou ícone de processamento
2. Selecione tipo de despesa (auto-preenchido)
3. Confirme data (pode ser hoje ou data da nota)
4. Sistema deve criar entrada em "Faturamento"

---

## Troubleshooting

### Erro: "Apenas arquivos XML e PDF são permitidos"
- Railway não redeployou ainda
- Solução: Aguarde 3-5 minutos e tente novamente

### Erro: "Arquivo Excel vazio"
- Arquivo corrompido ou não parseado
- Solução: Recrie o arquivo com `backend/create_test_excel.js`

### Erro: Conexão recusada
- Railway offline ou endpoint diferente
- Solução: Verifique https://caixa360.up.railway.app/

---

## Logs para Debug

**CLI import:**
```bash
node backend/importar-conta-azul-cli.js ./conta-azul-test.xlsx https://caixa360.up.railway.app/api 2>&1 | tee import.log
```

**Browser console:**
- F12 → Console
- Procure por "📊 Gerando CSV" ou "❌ Erro"

---

## Próximas Etapas

1. ✅ Confirmar importação de 8 notas
2. ✅ Confirmar export CSV/Excel funciona
3. ✅ Processar 2-3 notas como teste
4. 📋 Importar arquivo real do Conta Azul
5. 📋 Validar classificações automáticas
6. 📋 Ajustar mappings se necessário

---

**Tempo estimado:** 15 minutos (incluindo redeploy do Railway)
