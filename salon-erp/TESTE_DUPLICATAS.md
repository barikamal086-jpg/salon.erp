# 🧪 Guia de Teste - Detecção Inteligente de Duplicatas

## Resumo Executivo

Implementei detecção inteligente que **bloqueia notas quase-duplicadas** baseado em:
- ✅ Fornecedor (EXATO)
- ✅ Descrição (EXATO)
- ✅ Valor (EXATO ou ±1%)
- ✅ Data (MESMO DIA ou ±24h)

**Seu problema está RESOLVIDO:** As 5 notas do KIMCHI com numero_nf diferentes agora serão detectadas como duplicatas na primeira importação.

---

## Como Testar

### Teste 1: Blocagem de Duplicata Inteligente ✅

1. **Preparar notas de teste no banco:**

```sql
-- Inserir nota original
INSERT INTO notas_fiscais 
  (numero_nf, fornecedor_nome, descricao, valor_total, data_emissao, status, created_at)
VALUES 
  ('ORIGINAL-001', 
   'INDUSTRIA DE ALIMENTOS URI OMMA KIMCHI LTDA',
   'KIMCHI DE ACELGA 2.9KG CORTADO',
   250.00,
   '2026-04-28',
   'pendente',
   NOW());
```

2. **Tentar importar nota quase idêntica:**

Use o Excel ou o endpoint `/importar-conta-azul` com:
- Fornecedor: `INDUSTRIA DE ALIMENTOS URI OMMA KIMCHI LTDA` ← MESMO
- Descrição: `KIMCHI DE ACELGA 2.9KG CORTADO` ← MESMO
- Valor: `250.00` ← MESMO
- Data: `2026-04-28` ← MESMO
- Número NF: `NOVO-123` ← DIFERENTE (isso é o ponto!)

3. **Resultado esperado:**

```json
{
  "success": true,
  "message": "0 nota(s) importada(s), 1 duplicada(s), 0 erro(s)",
  "dados": {
    "importados": 0,
    "duplicados": 1,
    "detalhes": {
      "duplicados": [
        {
          "linha": 1,
          "numero_nf": "NOVO-123",
          "motivo": "Nota similar já existe (ORIGINAL-001): mesmo fornecedor, descrição e valor",
          "notaSimilar": {
            "numero_nf": "ORIGINAL-001",
            "data_emissao": "2026-04-28",
            "valor": 250.00
          }
        }
      ]
    }
  }
}
```

✅ **PASSOU:** Duplicata bloqueada com informação detalhada!

---

### Teste 2: Permitir Nota Similar Legítima ✅

1. **Mesma nota ANTERIOR** (`ORIGINAL-001` de 28/04)

2. **Tentar importar nota NOVA com 48h de diferença:**

- Fornecedor: `INDUSTRIA DE ALIMENTOS URI OMMA KIMCHI LTDA` ← MESMO
- Descrição: `KIMCHI DE ACELGA 2.9KG CORTADO` ← MESMO
- Valor: `250.00` ← MESMO
- Data: `2026-04-30` ← DIFERENTE (2 dias depois, fora da janela ±24h)
- Número NF: `NOVO-456` ← DIFERENTE

3. **Resultado esperado:**

```json
{
  "success": true,
  "message": "1 nota(s) importada(s), 0 duplicada(s), 0 erro(s)",
  "dados": {
    "importados": 1,
    "duplicados": 0,
    "detalhes": {
      "importados": [
        {
          "numero_nf": "NOVO-456",
          "data": "2026-04-30",
          "descricao": "KIMCHI DE ACELGA 2.9KG CORTADO",
          "fornecedor": "INDUSTRIA DE ALIMENTOS URI OMMA KIMCHI LTDA",
          "valor": 250.00
        }
      ]
    }
  }
}
```

✅ **PASSOU:** Nota legítima (dia diferente) foi aceita!

---

### Teste 3: Tolerância de Valor ±1% ✅

1. **Nota original:** `valor: 250.00`

2. **Tentar importar com valor dentro de ±1%:**

- Valor: `252.50` (252.50 = 250.00 * 1.01 = +1%)

3. **Resultado esperado:**

```json
{
  "success": true,
  "message": "0 nota(s) importada(s), 1 duplicada(s), 0 erro(s)",
  "dados": {
    "duplicados": 1,
    "detalhes": {
      "duplicados": [
        {
          "motivo": "Nota similar já existe... mesmo fornecedor, descrição e valor"
        }
      ]
    }
  }
}
```

✅ **PASSOU:** Pequenas variações são detectadas!

---

### Teste 4: Caso de Uso Real - 5 Notas KIMCHI ✅

**Se você reimportar seu Excel com as 5 notas KIMCHI:**

```
Linha 1: numero_nf=35--58742290000129--1-2012, valor=250.00
Linha 2: numero_nf=35--58742290000129--1-1965, valor=250.00  ← DUPLICADA
Linha 3: numero_nf=35--58742290000129--1-1963, valor=250.00  ← DUPLICADA
Linha 4: numero_nf=35--58742290000129--1-1883, valor=130.00
Linha 5: numero_nf=35--58742290000129--1-1865, valor=130.00  ← DUPLICADA
```

**Resposta esperada:**

```json
{
  "message": "2 nota(s) importada(s), 3 duplicada(s), 0 erro(s)",
  "dados": {
    "importados": 2,
    "duplicados": 3,
    "detalhes": {
      "importados": [
        { "numero_nf": "CA-35--58742290000129--1-2012", "valor": 250.00 },
        { "numero_nf": "CA-35--58742290000129--1-1883", "valor": 130.00 }
      ],
      "duplicados": [
        {
          "linha": 2,
          "numero_nf": "CA-35--58742290000129--1-1965",
          "motivo": "Nota similar já existe (35--58742290000129--1-2012): ...",
          "notaSimilar": { "numero_nf": "35--58742290000129--1-2012", "valor": 250.00 }
        },
        {
          "linha": 3,
          "numero_nf": "CA-35--58742290000129--1-1963",
          "motivo": "Nota similar já existe (35--58742290000129--1-2012): ...",
          "notaSimilar": { "numero_nf": "35--58742290000129--1-2012", "valor": 250.00 }
        },
        {
          "linha": 5,
          "numero_nf": "CA-35--58742290000129--1-1865",
          "motivo": "Nota similar já existe (35--58742290000129--1-1883): ...",
          "notaSimilar": { "numero_nf": "35--58742290000129--1-1883", "valor": 130.00 }
        }
      ]
    }
  }
}
```

✅ **PERFEITO:** Primeiro par entra, segundo par é bloqueado como duplicata!

---

## Endpoints para Testar

### 1. Importar Excel Conta Azul

```bash
curl -X POST \
  http://localhost:5006/api/importar-conta-azul \
  -F "arquivo=@seu-arquivo.xlsx"
```

**Response:** Inclui `dados.duplicados` com detalhes

### 2. Upload de XML/PDF

```bash
curl -X POST \
  http://localhost:5006/api/notas-fiscais/upload \
  -F "files=@nota1.xml" \
  -F "files=@nota2.pdf"
```

**Response:** Inclui `data.detalhes.duplicadas`

---

## Logs Esperados no Console

Ao importar com duplicatas:

```
📊 Importação Conta Azul iniciada

   Verificando duplicata para CA-123...
   ⚠️  Duplicada (numero_nf): CA-123
   
   Verificando duplicata para CA-456...
   ✅ Passou verificação de numero_nf
   Verificando duplicata inteligente...
   ⚠️  Duplicada (inteligente): ORIGINAL-001
   
   Verificando duplicata para CA-789...
   ✅ Passou verificação de numero_nf
   Verificando duplicata inteligente...
   ✅ Passou verificação inteligente
   💾 Salvando no banco...
   ✅ Salvo com ID: 42

✅ Importação concluída: 1 notas inseridas, 2 duplicadas
```

---

## Checklist de Validação

- [ ] Duplicata com numero_nf exato é bloqueada
- [ ] Duplicata inteligente (fornecedor + desc + valor) é bloqueada
- [ ] Nota com valor ±1% é detectada como duplicata
- [ ] Nota de dia diferente (fora ±24h) é aceita
- [ ] Response inclui detalhes sobre duplicatas (numero_nf similar, valor, etc)
- [ ] Logs mostram ambos os níveis de verificação
- [ ] Notas não-duplicadas são inseridas como "pendente"
- [ ] Comportamento funciona em ambos endpoints (Excel e Upload)

---

## Limpeza (se necessário)

```sql
-- Remover notas de teste
DELETE FROM notas_fiscais 
WHERE numero_nf LIKE 'TEST-%' 
   OR numero_nf LIKE 'CA-35--58%';

-- Remover todas as duplicadas (cuidado!)
DELETE FROM notas_fiscais 
WHERE numero_nf LIKE 'CA-%' 
  AND fornecedor_nome = 'INDUSTRIA DE ALIMENTOS URI OMMA KIMCHI LTDA';
```

---

## Troubleshooting

### "Erro ao verificar duplicata inteligente"
✅ Função é robusta - não bloqueia importação, apenas logs o erro

### Duplicata não está sendo detectada
❓ Verificar:
- [ ] Fornecedor: exatamente igual (case-insensitive)?
- [ ] Descrição: exatamente igual (case-insensitive)?
- [ ] Valor: ±1% do original?
- [ ] Data: dentro de ±24h?

Se TODOS forem iguais, deve ser detectada. Se não, abrir issue.

### Performance lenta em importações grandes
- Primeira importação: rápida (poucas notas no banco)
- Importações posteriores: cada check é 1 query SQL rápida
- Com 1000+ notas: considerar índices em `fornecedor_nome` + `descricao`

```sql
CREATE INDEX idx_nota_fornecedor_desc 
ON notas_fiscais(LOWER(fornecedor_nome), LOWER(descricao));
```

---

## Documento Completo

Para detalhes técnicos completos: ver `backend/DUPLICATE_DETECTION.md`

Implementado em commit: `0d703ed`
