# Changelog - 2026-05-02 Session 2
## Data Vencimento Modal Fix + Smart Date Handling

### Problem
Modal was displaying today's date (02/05/2026) instead of the invoice's actual due date from XML.

Example:
- Invoice due date in XML: 2026-04-15
- Modal showed: 02/05/2026 (today)

### Root Cause Analysis
1. XML parser's `_formatarData()` function returned today's date when input was null/undefined
2. `ide.dEmi` field not extracted from all XML variants/structures
3. Modal wasn't displaying `data_vencimento` from backend response
4. Date format: ISO timestamp not compatible with `input[type=date]`

### Changes Made

#### 1. Enhanced XML Parser
**File:** `backend/utils/NotaFiscalParser.js`

**Change 1.1:** Fallback chain for date extraction
```javascript
// Before: Only ide.dEmi
let dataEmissao = ide.dEmi;

// After: Fallback chain
let dataEmissao = ide.dEmi;
if (!dataEmissao) {
  dataEmissao = ide.dSaiEnt || ide.dEmiDi || ide.dhEmi || null;
}
```

**Change 1.2:** Simplified logging
- Removed verbose logging from parseXML()
- Removed detailed logging from _formatarData()
- Output now shows ONLY: `📅 data_vencimento:` and `📅 data_atual:`

**Change 1.3:** Extracted vencimento from cobr.dup
```javascript
let dataVencimento = dataEmissao;
if (cobr.dup) {
  const dup = Array.isArray(cobr.dup) ? cobr.dup[0] : cobr.dup;
  dataVencimento = dup.dVenc || dataEmissao;
}
```

#### 2. New Diagnostic Endpoint
**File:** `backend/routes/api.js`

Added `POST /api/diagnosticos/testar-xml` endpoint to test XML extraction without full processing.

**Usage:**
```bash
curl -X POST https://seu-dominio/api/diagnosticos/testar-xml \
  -F "arquivo=@nota.xml"
```

**Response includes:**
- `data_emissao` extracted from XML
- `data_vencimento` extracted from XML
- Validation that dates are in YYYY-MM-DD format

#### 3. Improved Modal UI
**File:** `backend/frontend/index.html`

**Change 3.1:** Added data_vencimento display
```html
<!-- Data de Vencimento (read-only) -->
<div v-if="sugestaoData.data_vencimento" class="bg-gray-50 p-3 rounded">
  <label>📅 Vencimento:</label>
  <input
    :value="sugestaoData.data_vencimento?.split('T')[0]"
    type="date"
    disabled>
</div>

<!-- Data do Lançamento (editable) -->
<div>
  <label>📝 Data do Lançamento:</label>
  <input
    v-model="dataCustomizada"
    type="date">
</div>
```

**Change 3.2:** Smart date default logic
```javascript
// REGRA: Use data_vencimento if available; else use data_emissao
const hoje = new Date().toISOString().split('T')[0];
let dataSugerida = response.data.data.data_emissao;

if (response.data.data.data_vencimento) {
  dataSugerida = response.data.data.data_vencimento;
}

this.dataCustomizada = dataSugerida || hoje;
```

**Change 3.3:** Fixed ISO timestamp format
```javascript
// Before: :value="sugestaoData.data_vencimento"
//         Error: "2026-04-15T00:00:00.000Z" does not conform to "yyyy-MM-dd"

// After: :value="sugestaoData.data_vencimento?.split('T')[0]"
//        Result: "2026-04-15" ✅
```

### Commits

| Commit | Message | Files |
|--------|---------|-------|
| 055c59e | Simplify logging to show only data_vencimento and data_atual | NotaFiscalParser.js |
| 5bc0c74 | Add XML extraction diagnosis endpoint and test script | api.js, test-xml-extraction.js |
| 62b9b9d | Add detailed logging for data_vencimento extraction | NotaFiscalParser.js |
| 245030a | Add data_vencimento display in modal | index.html |
| 856af2d | Apply RULE: Use data_vencimento from XML if available | index.html |
| c53ed17 | Fix date format in data_vencimento field | index.html |

### Testing Performed

✅ **Modal Display Test**
- Verified modal shows data_vencimento (gray, disabled)
- Verified modal shows data_lançamento (white, editable)
- Verified both dates display in YYYY-MM-DD format

✅ **Date Logic Test**
- Invoice with data_vencimento: Modal pre-fills with vencimento date
- Invoice without data_vencimento: Modal pre-fills with emissao date
- User can edit both fields independently

✅ **Console Error Check**
- No errors: "does not conform to yyyy-MM-dd"
- No undefined value errors in modal

✅ **XML Extraction Test**
- Tested endpoint with real XML
- Verified data_vencimento extracted correctly
- Verified fallback works when ide.dEmi missing

### Impact

**Before:**
```
Modal: Data do Lançamento
Input: [02/05/2026] ❌ Today's date, not from XML
```

**After:**
```
Modal: Data do Lançamento
       📅 Vencimento: [2026-04-15] (from XML)
       📝 Data do Lançamento: [2026-04-15] (editable)
```

**User Experience:**
1. Clicks "Processar" on note
2. Modal opens with real XML due date
3. Can accept it or override with different date
4. Sees why that date was suggested (shows vencimento)

### Backward Compatibility
✅ 100% backward compatible
- Existing notes without data_vencimento still work
- Modal falls back to data_emissao if no vencimento
- No database schema changes
- No API breaking changes

### Performance Impact
✅ Minimal
- One additional optional field display in modal
- No new database queries
- Diagnostic endpoint only used on-demand

### Rollback Plan
If issues discovered:
```bash
git revert c53ed17 855adf2d 856af2d 245030a 62b9b9d 5bc0c74 055c59e
```

### Known Limitations
1. XML parser assumes standard NF-e v4.0 structure
2. If XML has custom date fields, fallback chain may not find them
3. Diagnostic endpoint not available in production for security reasons (should be removed)

### Future Improvements
1. Remove diagnostic endpoint from production
2. Add logging to track which fallback field was used
3. Support for different XML versions/variations
4. Configurable fallback chain per empresa

### Notes
- User feedback: "FUNCIONOU!" ✅
- No issues reported in testing
- Ready for production deployment
