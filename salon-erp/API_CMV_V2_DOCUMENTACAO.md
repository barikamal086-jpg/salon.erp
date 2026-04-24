# 📡 API CMV V2 — DOCUMENTAÇÃO

## 🚀 Endpoint

```
POST /api/cmv-v2/analisar
```

### Host
```
http://localhost:5006
```

---

## 📥 Request

### Content-Type
```
application/json
```

### Body Structure

```javascript
{
  // OBRIGATÓRIO: Período e restaurante
  "mes": "2026-02",                    // Formato: YYYY-MM
  "restaurante": "KAIA Bar e Lanches", // Nome ou ID

  // OBRIGATÓRIO: Dados de receita
  "receita": {
    "bruta": 247313.65,      // Receita bruta (todas as plataformas)
    "taxas": 43706.78,       // Soma de taxas iFood + 99Food + Keeta
    "liquida": 203606.87     // RB - Taxas
  },

  // OBRIGATÓRIO: Dados de CMV
  "cmv": {
    "sistema": 35000.00,       // Conta Azul / Notas Fiscais
    "cartaoItau": 7500.00,     // Cartão Itaú
    "cartaoBradesco": 3311.55, // Cartão Bradesco
    "total": 45811.55          // Soma total (após remover duplicidades)
  },

  // OPCIONAL: CMV por categoria
  "cmvPorCategoria": {
    "Carnes": 17040.28,
    "Bebidas": 12167.50,
    "Hortifruti": 10094.70,
    "Laticínios": 4641.25,
    "Padaria": 3527.92,
    "Óleo": 1800.00,
    "Batata": 1140.00,
    "Embalagens": 1009.65,
    "Gelo": 742.50
  },

  // OPCIONAL: Compras detalhadas (para detecção de duplicidades)
  "compras": [
    {
      "fornecedor": "BEEF Frigorífico",
      "valor": 7119.00,
      "data": "2026-02-12",
      "fonte": "Sistema",     // Sistema | Cartão Itaú | Cartão Bradesco
      "categoria": "Carnes"
    },
    // ... mais compras
  ],

  // OPCIONAL: Benchmarks customizados
  "benchmarks": {
    "CMV_META": 22,            // % meta esperada
    "CMV_ALERTA": 25,          // % acima do qual dispara alerta
    "CMV_CRITICO": 30,         // % acima do qual é crítico
    "TAXA_PLATAFORMA_ALERTA": 35, // Taxa % acima da qual alerta
    "JANELA_DUPLICIDADE": 3,   // ±N dias para detectar duplicidade
    "MARGEM_DUPLICIDADE": 0.05 // ±5% valor para considerar duplicidade
  }
}
```

---

## 📤 Response (201 / 200)

### Success Response

```javascript
{
  "success": true,
  "analise": {
    "mes": "2026-02",
    "restaurante": "KAIA",

    // RECEITA
    "receita": {
      "bruta": 247313.65,
      "taxas": 43706.78,
      "liquida": 203606.87
    },

    // CMV RESULTADO
    "cmv": {
      "total": 45811.55,
      "percentualRL": "22.50",    // ← CRÍTICO: sobre RL, não RB
      "meta": 22,
      "variacao": "0.50"          // Quanto acima/abaixo da meta
    },

    // SITUAÇÃO GERAL
    "situacao": {
      "status": "ALERTA",         // EXCELENTE | SAUDÁVEL | ALERTA | CRÍTICO
      "cor": "yellow",            // green | blue | yellow | red
      "descricao": "CMV 22.5% acima da meta. Investigar causas.",
      "cmvPercentual": 22.50,
      "meta": 22
    },

    // ANÁLISE DE TAXAS DE PLATAFORMA
    "taxasPlataforma": {
      "iFood": {
        "valor": 15007.32,
        "percentual": "6.1",
        "alerta": false
      },
      "_99Food": {
        "valor": 10219.53,
        "percentual": "4.1",
        "alerta": false
      },
      "Keeta": {
        "valor": 18479.93,
        "percentual": "7.5",
        "alerta": true           // ← Acima do limite (44,1%)
      }
    },

    // DUPLICIDADES DETECTADAS
    "duplicidades": {
      "removidas": [
        {
          "fornecedor": "BEEF Frigorífico",
          "valor": 7119.00,
          "fonte1": "Sistema",
          "data1": "2026-02-12",
          "fonte2": "Cartão Itaú",
          "data2": "2026-02-14",
          "diferenca": 0.00
        }
      ],
      "impacto": "7119.00"       // Total duplicado e removido
    },

    // PROBLEMAS DETECTADOS
    "problemas": [
      {
        "tipo": "CMV_ACIMA_META",
        "severidade": "ALERTA",
        "descricao": "CMV 22.5% acima da meta 22%",
        "impacto": "Perda de margem de 0.5%"
      },
      {
        "tipo": "DUPLICIDADE_DETECTADA",
        "severidade": "ALERTA",
        "descricao": "1 duplicidade(s) encontrada(s)",
        "impacto": "R$ 7119.00 contabilizado duplo"
      },
      {
        "tipo": "TAXA_PLATAFORMA_ALTA",
        "severidade": "ALERTA",
        "plataforma": "Keeta",
        "descricao": "Taxa 44.1% (limite 35%)",
        "impacto": "Reduz receita líquida"
      }
    ],

    // RECOMENDAÇÕES PRIORIZADAS
    "recomendacoes": [
      {
        "prioridade": "ALTA",
        "acao": "Auditoria de Custos de Mercadoria",
        "detalhes": "Analisar fornecedores de Carnes, Bebidas e Hortifruti (maiores % CMV)",
        "impacto": "Reduzir 3% no CMV recupera margem de 3%"
      },
      {
        "prioridade": "ALTA",
        "acao": "Renegociar Keeta",
        "detalhes": "Taxa em 44.1% é insustentável. Renegociar para ~20%",
        "impacto": "Cada 1% economizado = 1% receita extra"
      },
      {
        "prioridade": "MÉDIA",
        "acao": "Revisar Processo de Lançamento",
        "detalhes": "Implementar validação para evitar duplas entradas CA + Cartão",
        "impacto": "Eliminar erros de contabilização"
      }
    ],

    // CMV POR CATEGORIA
    "porCategoria": {
      "Carnes": {
        "valor": "17040.28",
        "percentualRL": "8.4"     // % da Receita Líquida
      },
      "Bebidas": {
        "valor": "12167.50",
        "percentualRL": "6.0"
      },
      // ... mais categorias
    },

    // CMV POR FONTE
    "porFonte": {
      "sistema": {
        "valor": "35000.00",
        "percentualRL": "17.2",    // % da Receita Líquida
        "percentualCMV": "76.4"    // % do CMV total
      },
      "cartaoItau": {
        "valor": "7500.00",
        "percentualRL": "3.7",
        "percentualCMV": "16.4"
      },
      "cartaoBradesco": {
        "valor": "3311.55",
        "percentualRL": "1.6",
        "percentualCMV": "7.2"
      }
    },

    "dataAnalise": "2026-04-17T18:46:36.649Z"
  },

  // RELATÓRIO FORMATADO EM TEXTO
  "relatorio": "=== ANÁLISE DE CMV — 2026-02 ===\n\n📊 SITUAÇÃO: ALERTA\n...",

  "tipo": "cmv-v2-generico",
  "versao": "2.0",
  "timestamp": "2026-04-17T18:46:36.649Z"
}
```

### Error Response (400/500)

```javascript
{
  "success": false,
  "error": "Parâmetros 'receita' e 'cmv' são obrigatórios"
}
```

---

## 📝 Exemplos de Uso

### cURL

```bash
curl -X POST http://localhost:5006/api/cmv-v2/analisar \
  -H "Content-Type: application/json" \
  -d '{
    "mes": "2026-02",
    "restaurante": "KAIA",
    "receita": {
      "bruta": 247313.65,
      "taxas": 43706.78,
      "liquida": 203606.87
    },
    "cmv": {
      "sistema": 35000,
      "cartaoItau": 7500,
      "cartaoBradesco": 3311.55,
      "total": 45811.55
    },
    "benchmarks": {
      "CMV_META": 22
    }
  }'
```

### JavaScript / Node.js

```javascript
const response = await fetch('http://localhost:5006/api/cmv-v2/analisar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mes: '2026-02',
    restaurante: 'KAIA',
    receita: {
      bruta: 247313.65,
      taxas: 43706.78,
      liquida: 203606.87
    },
    cmv: {
      sistema: 35000,
      cartaoItau: 7500,
      cartaoBradesco: 3311.55,
      total: 45811.55
    },
    benchmarks: {
      CMV_META: 22
    }
  })
});

const data = await response.json();
console.log(`CMV: ${data.analise.cmv.percentualRL}%`);
console.log(`Status: ${data.analise.situacao.status}`);
```

### Python

```python
import requests
import json

url = "http://localhost:5006/api/cmv-v2/analisar"

payload = {
    "mes": "2026-02",
    "restaurante": "KAIA",
    "receita": {
        "bruta": 247313.65,
        "taxas": 43706.78,
        "liquida": 203606.87
    },
    "cmv": {
        "sistema": 35000,
        "cartaoItau": 7500,
        "cartaoBradesco": 3311.55,
        "total": 45811.55
    },
    "benchmarks": {
        "CMV_META": 22
    }
}

response = requests.post(url, json=payload)
data = response.json()

print(f"CMV: {data['analise']['cmv']['percentualRL']}%")
print(f"Status: {data['analise']['situacao']['status']}")
```

---

## 🎯 Status Codes

| Code | Significado |
|------|-------------|
| 200  | Sucesso - Análise completada |
| 400  | Erro de validação - Parâmetros obrigatórios faltando |
| 500  | Erro interno - Contate o suporte |

---

## 🔄 Fluxo de Integração

```
[Frontend/App]
    ↓
[POST /api/cmv-v2/analisar]
    ↓
[CMVAnalyzerV2.analisar()]
    ↓
Retorna: {
  - Situação (EXCELENTE/SAUDÁVEL/ALERTA/CRÍTICO)
  - CMV% correto (sobre RL)
  - Duplicidades detectadas
  - Problemas identificados
  - Recomendações priorizadas
  - Relatório formatado
}
```

---

## ✅ Validação

Testado com KAIA Fevereiro 2026:
- ✅ CMV 22,5% (sobre RL R$ 203.606,87)
- ✅ Status ALERTA (0,5% acima da meta)
- ✅ Duplicidades detectadas corretamente
- ✅ Recomendações geradas automaticamente

---

## 📞 Suporte

- **Documentação**: Veja `CMVANALYZER_V2_IMPLEMENTADO.md`
- **Testes**: `backend/tests/KAIA_FEVEREIRO_2026_TESTE.js`
- **Exemplos**: Veja section de examples acima
