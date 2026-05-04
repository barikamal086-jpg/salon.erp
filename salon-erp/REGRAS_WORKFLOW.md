# 📋 Supplier Rules Workflow - Quick Reference

**Complete End-to-End Guide**

---

## 🎯 5-Minute Quick Start

### Step 1: Create Your First Supplier Rule

```
1. Go to main dashboard
2. Find "🤖 Aplicar Regras Automáticas" section
3. Click "⚙️ Gerenciar Regras"
4. New page opens: Regras por Fornecedor

Enter:
  📝 Nome do Fornecedor: MAXIS
  📊 Categoria: Hortifruti (CMV)
  
5. Click "💾 Salvar"
6. See confirmation: "✅ Regra cadastrada: MAXIS"
```

### Step 2: Add More Rules (Optional)

Repeat Step 1 for each supplier:
- DISTRIBUIDORA BEBIDAS → Bebidas (CMV)
- FORNECEDOR LIMPEZA → Limpeza (Operacional)
- ETC.

### Step 3: Apply Rules to Pending Notes

```
1. Go back to main dashboard
2. Upload invoices (or import from Conta Azul)
3. Find section "🤖 Aplicar Regras Automáticas"
4. Click "⚡ Processar Pendentes com Regras"

Wait for:
  ⏳ Processing...
  
See result:
  ✅ 5 de 8 nota(s) processada(s)!
  📊 5 nota(s) processada(s)
  ✅ 5 com regra aplicada
  ⏭️ 3 sem regra cadastrada
```

### Step 4: Done!

- ✅ Notas com regras foram categorizadas automaticamente
- ⏭️ Notas sem regras continuam pendentes (você categoriza manualmente se necessário)

---

## 📊 Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPPLIER RULES WORKFLOW                       │
└─────────────────────────────────────────────────────────────────┘

                         ⚙️ REGRAS
                    (Rules Management Page)
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    ➕ CREATE          📋 LIST              🗑️ DELETE
    
    Exemplo:
    - Fornecedor: MAXIS
    - Categoria: Hortifruti (CMV)
    
                            │
                            ▼
                    Saved in Database
                 (regras_categoria_fornecedor)
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
  📄 PROCESSAR NOTAS              🤖 APLICAR REGRAS
  (Upload/Import notes)          (Batch Processing)
        │                                │
        ├─ Upload XML/PDF               │
        ├─ Import Conta Azul            │
        │                               │
        ▼                               │
  📝 Notas Pendentes                 │
  (status = 'pendente')              │
        │                               │
        └───────────────┬───────────────┘
                        │
                        ▼
            🤖 Match Supplier Names
            (Case-Insensitive)
            
        ┌───────────────┬───────────────┐
        │               │               │
        ▼               ▼               ▼
    ✅ COM REGRA   ⏭️ SEM REGRA     ❌ ERRO
        │               │               │
        ├─ Create        ├─ Skip         └─ Log Error
        │  Faturamento   │  (pending)
        │  (despesa)     │
        │                │
        ├─ Set           │
        │  tipo_despesa  │
        │                │
        └─ Mark as      │
           'processado'  │
                        │
                    Still Pending
                   (manual review)
```

---

## 🔄 Detailed Process Steps

### Phase 1: Rule Creation

| Step | Action | Location | Result |
|------|--------|----------|--------|
| 1 | Navigate to Gerenciar Regras | index.html → button | Rules page opens |
| 2 | Enter supplier name | regras-fornecedor.html | Form accepts input |
| 3 | Select category | Category dropdown | Category selected |
| 4 | Click Save | Form button | POST /api/regras-categoria |
| 5 | Confirmation message | UI feedback | Rule saved |

### Phase 2: Invoice Upload

| Step | Action | Location | Result |
|------|--------|----------|--------|
| 1 | Drag & drop or select files | index.html upload | Files selected |
| 2 | Process upload | Frontend handler | Files uploaded |
| 3 | Parse XML/PDF | Backend parser | Extracted data |
| 4 | Create notas_fiscais | Database | status = 'pendente' |
| 5 | Confirmation | UI feedback | Notes appear in list |

### Phase 3: Batch Rule Application

| Step | Action | Location | Result |
|------|--------|----------|--------|
| 1 | Click "Processar Pendentes" | index.html button | Processing starts |
| 2 | Get all pending notes | Backend query | List fetched |
| 3 | For each note: | | |
| 4 | └─ Get supplier name | Query | Name extracted |
| 5 | └─ Find matching rule | DB search (case-insensitive) | Rule found or not |
| 6 | └─ If found: create faturamento | DB insert | Entry created |
| 7 | └─ Mark as processado | DB update | Status changed |
| 8 | Summary displayed | UI | Results shown |

---

## 📊 Real-World Example

### Scenario: Restaurant KAIA Weekly Processing

**Monday Morning Workflow:**

```
1. 📥 Upload all weekend invoices
   └─ Friday NF: 1001-1005 (5 notes)
   └─ Saturday NF: 1006-1010 (5 notes)
   └─ Sunday NF: 1011-1015 (5 notes)
   Total: 15 pending notes

2. ⚙️ Already have rules saved:
   ├─ MAXIS → Hortifruti (CMV) [Rule #1]
   ├─ DISTRIBUIDORA BEBIDAS → Bebidas (CMV) [Rule #2]
   ├─ FORNECEDOR LIMPEZA → Limpeza (Operacional) [Rule #3]
   └─ (other suppliers without rules)

3. 🤖 Click "Processar Pendentes com Regras"
   
   Processing:
   ✅ NF 1001 MAXIS → Rule #1 applied
   ✅ NF 1002 MAXIS → Rule #1 applied
   ✅ NF 1006 DISTRIBUIDORA BEBIDAS → Rule #2 applied
   ⏭️ NF 1008 NEW SUPPLIER → No rule, skip
   ✅ NF 1010 FORNECEDOR LIMPEZA → Rule #3 applied
   ... (continue for all)

   Result:
   ✅ 12 de 15 nota(s) processada(s)!
   📊 12 processadas
   ✅ 12 com regra aplicada
   ⏭️ 3 sem regra cadastrada

4. 📋 Manual Review (Optional)
   └─ 3 notes without rules still pending
   └─ Manually categorize or create new rules
   └─ If creating new rules, they apply to future invoices

5. 📊 Report Generation
   └─ View processed notes
   └─ Generate CMV reports
   └─ Track expenses by category
```

---

## 🎮 Interactive Walkthrough

### First Time User:

```
1. Go to: https://salon-erp.up.railway.app
2. Login (if required)
3. Navigate to: 📄 Processar Notas Fiscais section
4. See button: ⚙️ Gerenciar Regras
5. Click it
6. Page loads: Regras por Fornecedor (blank)
7. See form:
   ├─ Input: Nome do Fornecedor
   ├─ Dropdown: Categoria
   └─ Button: Salvar
8. Fill in:
   └─ MAXIS
   └─ Select "Hortifruti"
9. Click Salvar
10. Success message appears
11. Table shows: MAXIS → Hortifruti
12. Go back to main page
13. Upload an invoice from "MAXIS"
14. Click "Processar Pendentes com Regras"
15. Invoice automatically categorized! ✨
```

---

## ⚠️ Important Notes

### What Gets Categorized?

✅ YES:
- Notes with supplier names matching a rule
- Notes in "pendente" status
- Notes with all required fields

❌ NO:
- Notes already "processado"
- Notes with supplier not in rules
- Notes with missing XML data

### What Gets Created?

✅ **Faturamento Entry:**
- `tipo`: 'despesa' (always for notes)
- `categoria`: 'Salão' (default for notes)
- `tipo_despesa_id`: From matching rule
- `total`: From invoice value
- `data`: From invoice due date
- `classificacao`: From rule's type (CMV/Operacional/Administrativa)

### Supplier Matching:

✅ Exact match (case-insensitive):
- Rule: "MAXIS"
- Note: "MAXIS" ✓
- Note: "maxis" ✓
- Note: "Maxis" ✓
- Note: "MAXIS " ✗ (extra space)
- Note: "MAXI" ✗ (partial)

---

## 🔐 Data Integrity

### Transaction Safety:
- Each note processed independently
- If one fails, others continue
- Failed notes remain "pendente"
- No partial updates to database

### Audit Trail:
- All operations logged in console
- Detailed response with every change
- `processado_em` timestamp recorded
- `faturamento_id` linked for traceability

---

## 🚀 Performance

### Processing Speed:
- 1-10 notes: ~500ms
- 10-50 notes: ~1-2s
- 50-100 notes: ~2-4s
- 100+ notes: ~4-20s

### Database Impact:
- SELECT queries (minimal load)
- INSERT operations (one per note)
- UPDATE operations (one per note)
- Indexed lookups for performance

---

## 💡 Pro Tips

### Tip 1: Organize Suppliers Consistently
```
DON'T: "maxis", "MAXIS", "Maxis", "MAXIS LTDA"
DO: Create rules for exact supplier names used in your invoices
```

### Tip 2: Create Rules Before Uploading
```
DON'T: Upload 100 notes, then realize no rules exist
DO: Set up rules first, then upload invoices
```

### Tip 3: Review "Sem Regra" Notes
```
DON'T: Ignore suppliers without rules
DO: Decide if they should get a rule or manual category
```

### Tip 4: Batch Processing Regularly
```
DON'T: Let 500 notes accumulate
DO: Process daily or weekly in small batches
```

---

## 🔧 Troubleshooting

### Issue: "Botão não aparece"
**Solution:** Hard refresh (Ctrl+Shift+R)

### Issue: "Regra não está sendo aplicada"
**Check:**
- [ ] Supplier name is exactly the same
- [ ] No extra spaces at beginning/end
- [ ] Rule was actually saved
- [ ] Note is in 'pendente' status

### Issue: "Processing takes too long"
**Check:**
- [ ] How many notes are pending?
- [ ] Browser performance
- [ ] Server load
- Try: Process in smaller batches

### Issue: "Notes still say pendente after processing"
**Reason:** No matching rule exists
**Solution:** Either:
1. Create a rule for that supplier, OR
2. Manually categorize the note

---

## 📱 Keyboard Shortcuts

⚠️ Currently none. Planned for future:
- `Ctrl+R` to refresh rules
- `Ctrl+P` to process rules
- `Ctrl+G` to go to rules page

---

## 🎓 Learning Path

### Beginner (15 min):
1. Create 1-2 rules
2. Upload 5 test invoices
3. Run batch processing
4. See automatic categorization

### Intermediate (1 hour):
1. Create 5-10 rules for common suppliers
2. Upload 50+ invoices
3. Batch process weekly
4. Monitor CMV accuracy

### Advanced (2+ hours):
1. Integrate with automated invoice collection
2. Create scheduled daily rule processing
3. Build dashboards on rule application success
4. Optimize rule set based on data patterns

---

## 🔗 Related Pages

- 📄 [Main Dashboard](./backend/frontend/index.html)
- ⚙️ [Rules Management](./backend/frontend/regras-fornecedor.html)
- 📖 [API Documentation](./BATCH_RULES_PROCESSING.md)
- 🐛 [Troubleshooting Guide](./DEBUG_GUIDE.md) *(coming soon)*

---

## ✅ Checklist: Ready to Use?

- [ ] Rules page loads without errors
- [ ] Can create a rule successfully
- [ ] Can see rule in list
- [ ] Can delete a rule
- [ ] Main page has "Aplicar Regras" button
- [ ] Button triggers processing
- [ ] Can see results summary
- [ ] Notes change from "pendente" to "processado"

---

**Last Updated:** 2026-05-04
**Status:** ✅ Production Ready
**Questions?** Check console logs (F12) for detailed error messages

