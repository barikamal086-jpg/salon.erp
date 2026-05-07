# 🧪 Guia de Testes - Formatação em Tempo Real

**Data:** 2026-05-07  
**Fix Aplicado:** a6edb2f  
**Status:** PRONTO PARA TESTE

---

## 📋 Checklist de Testes

### Teste 1: Modal Editar (CRÍTICO ✨)

**Objetivo:** Verificar se a formatação acontece em tempo real ao digitar números puros

**Passos:**

1. ✅ Abrir o Dashboard em http://localhost:5006
2. ✅ Clicar em qualquer linha da tabela "Histórico"
3. ✅ No modal "Editar Lançamento", encontrar o campo "💰 Valor"
4. ✅ Apagar o valor atual completamente
5. ✅ Digitar: `841133` (apenas números, sem separadores)
6. ✅ **OBSERVAR:** Enquanto digita, o campo deve mudar de:
   - Você digita: `8` → Campo mostra: `8`
   - Você digita: `84` → Campo mostra: `84`
   - Você digita: `841` → Campo mostra: `841`
   - Você digita: `8411` → Campo mostra: `8.411`
   - Você digita: `84113` → Campo mostra: `84.113`
   - Você digita: `841133` → Campo mostra: `8.411,33` ✨ **MAGIC!**

7. ✅ Clique em "Salvar"
8. ✅ Modal fecha
9. ✅ Verificar na tabela "Histórico" que o valor é exibido como "R$ 8.411,33"
10. ✅ Verificar no Dashboard (seção "Performance por Categoria") que a receita foi atualizada

**Resultado Esperado:** ✅ Formatação em tempo real funciona, valor salvo corretamente

**Se falhar:**
- [ ] Abrir DevTools (F12)
- [ ] Console → Verificar se há erros JavaScript
- [ ] Recarregar página (F5)
- [ ] Tentar novamente

---

### Teste 2: Nova Receita/Despesa

**Objetivo:** Verificar se formatação também funciona no formulário de nova receita

**Passos:**

1. ✅ Na aba "Histórico", clique em "Lançar Receita/Despesa"
2. ✅ Modal abre com formulário
3. ✅ Encontre o campo "Valor Total"
4. ✅ Clique no campo
5. ✅ Digite: `12345` (apenas números)
6. ✅ **OBSERVAR:** Campo deve formatar enquanto digita:
   - Você digita: `1` → Campo mostra: `0,01` ✨
   - Você digita: `12` → Campo mostra: `0,12` ✨
   - Você digita: `123` → Campo mostra: `1,23` ✨
   - Você digita: `1234` → Campo mostra: `12,34` ✨
   - Você digita: `12345` → Campo mostra: `123,45` ✨

7. ✅ Preencha os outros campos (Data, Categoria, Tipo)
8. ✅ Clique "Salvar"
9. ✅ Verificar na tabela que o valor foi salvo como "R$ 123,45"

**Resultado Esperado:** ✅ Formatação em tempo real funciona também aqui

---

### Teste 3: Formato Brasileiro Completo

**Objetivo:** Verificar que o sistema ainda aceita formato brasileiro tradicional

**Passos:**

1. ✅ Abrir modal "Editar Lançamento" (qualquer linha)
2. ✅ Apagar valor atual
3. ✅ Digitar: `8.411,33` (com ponto e vírgula)
4. ✅ **OBSERVAR:** Campo deve:
   - NÃO reformatar (já está correto)
   - Ou reformatar internamente mas mostrar como está
5. ✅ Clique "Salvar"
6. ✅ Verificar que salvou como "R$ 8.411,33"

**Resultado Esperado:** ✅ Formato brasileiro funciona

---

### Teste 4: Formato Sem Milhar

**Objetivo:** Verificar formato brasileiro sem separador de milhar

**Passos:**

1. ✅ Abrir modal "Editar Lançamento"
2. ✅ Apagar valor
3. ✅ Digitar: `8411,33` (vírgula mas SEM ponto de milhar)
4. ✅ **OBSERVAR:** Campo deve formatar para `8.411,33`
5. ✅ Clique "Salvar"
6. ✅ Verificar que salvou como "R$ 8.411,33"

**Resultado Esperado:** ✅ Normalização de formato funciona

---

### Teste 5: Valores Pequenos

**Objetivo:** Verificar edge cases com números pequenos

**Passos:**

Para cada valor abaixo:

1. ✅ Abrir modal "Editar"
2. ✅ Apagar valor
3. ✅ Digitar o valor
4. ✅ Verificar formatação
5. ✅ Salvar
6. ✅ Verificar no histórico

| Você digita | Deve formatar | Deve salvar |
|-------------|---------------|-----------|
| `1` | `0,01` | R$ 0,01 |
| `5` | `0,05` | R$ 0,05 |
| `10` | `0,10` | R$ 0,10 |
| `99` | `0,99` | R$ 0,99 |
| `100` | `1,00` | R$ 1,00 |
| `999` | `9,99` | R$ 9,99 |
| `1000` | `10,00` | R$ 10,00 |

**Resultado Esperado:** ✅ Todos os valores formatam corretamente

---

### Teste 6: Números Grandes

**Objetivo:** Verificar que funciona com valores grandes

**Passos:**

1. ✅ Abrir modal "Editar"
2. ✅ Apagar valor
3. ✅ Digitar: `999999` (1 milhão de centavos = R$ 9.999,99)
4. ✅ **OBSERVAR:** Campo deve formatar para `9.999,99`
5. ✅ Digitar: `1234567` (R$ 12.345,67)
6. ✅ **OBSERVAR:** Campo deve formatar para `12.345,67`
7. ✅ Salvar
8. ✅ Verificar que salvou corretamente

**Resultado Esperado:** ✅ Funciona com valores grandes

---

### Teste 7: Sincronização Dashboard ↔ Histórico

**Objetivo:** Verificar que após editar, Dashboard e Histórico ficam sincronizados

**Passos:**

1. ✅ Abrir Dashboard
2. ✅ Anotar valor da receita (ex: R$ 5.000,00)
3. ✅ Ir para "Histórico"
4. ✅ Editar um lançamento (aumentar valor para R$ 8.000,00)
5. ✅ Clicar "Salvar"
6. ✅ Voltar para Dashboard
7. ✅ **VERIFICAR:** Receita agora deve ser R$ 8.000,00 (não R$ 5.000,00)

**Resultado Esperado:** ✅ Dashboard atualiza imediatamente após edição

---

### Teste 8: DevTools Console Check

**Objetivo:** Verificar que não há erros JavaScript

**Passos:**

1. ✅ Abrir DevTools (F12)
2. ✅ Clicar na aba "Console"
3. ✅ Executar um dos testes acima (editar valor)
4. ✅ Verificar se há mensagens de ERRO (vermelho)

**Resultado Esperado:** 
- ✅ Console limpo (sem erros vermelhos)
- ✅ Pode ter warnings amarelos, ok
- ✅ Pode ter mensagens azuis de debug, ok

---

## 🎯 Teste de Regressão

**Objetivo:** Verificar que mudanças não quebraram funcionalidades existentes

### Verificar Funcionalidades Existentes

- [ ] Dashboard carrega valores corretos
- [ ] Histórico mostra registros corretos
- [ ] Filtro de datas funciona
- [ ] Filtro de categoria funciona
- [ ] Gráficos atualizam corretamente
- [ ] Performance por Categoria mostra valores corretos
- [ ] Botão "Salvar" não aceita valores inválidos
- [ ] Modal "Editar" fecha corretamente após Salvar
- [ ] Modal "Editar" fecha corretamente após Cancelar

---

## 📊 Resultado Summary

### Antes da correção (❌)
```
Usuário digita: "841133"
Campo mostra:   "84133"     ← Sem formatação
Salva como:     R$ 84.133,00 (❌ ERRADO!)
```

### Depois da correção (✅)
```
Usuário digita: "841133"
Campo mostra:   "8.411,33"  ← Formatação em tempo real!
Salva como:     R$ 8.411,33 (✅ CORRETO!)
```

---

## 🚨 Se Algo Não Funcionar

### Checklist de Diagnóstico

1. **[ ] Abrir DevTools (F12)**
   - Ir para Console
   - Procurar por erros (vermelho)
   - Se houver, anotar mensagem de erro

2. **[ ] Recarregar página (F5)**
   - Às vezes cache do browser causa problema
   - Tentar força recarregar (Ctrl + Shift + R no Windows)

3. **[ ] Verificar se parseValorInteligente existe**
   - No Console, digitar: `parseValorInteligente("841133")`
   - Deve retornar: `8411.33`
   - Se disser "undefined", arquivo numberParser.js não foi carregado

4. **[ ] Verificar se formatBrasilValue existe**
   - No Console, digitar: `formatBrasilValue(8411.33)`
   - Deve retornar: `"8.411,33"`
   - Se disser "undefined", arquivo numberParser.js não foi carregado

5. **[ ] Verificar server está rodando**
   - `curl http://localhost:5006/`
   - Deve retornar HTML da página
   - Se recusar conexão, backend não está rodando

### Teste do Parser Direto

Para testar as funções de parsing sem interface gráfica:

1. Abra: http://localhost:5006/frontend/test-formatter.html
2. Verificar se todos os testes passam (✅ verde)
3. Se algum falhar (❌ vermelho), anotar qual teste e valor

---

## ✅ Próximo Passo

Após validar todos os testes:

- [x] Fix implementado
- [x] Documentação criada
- [ ] Testes manuais executados
- [ ] Push para origin/master

