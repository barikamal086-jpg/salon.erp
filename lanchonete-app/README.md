# 🍔 Lanchonete App - PWA de Registro de Vendas

App React + Vite 100% offline para registro de vendas de lanchonete. Funciona como PWA instalável em dispositivos móveis.

## 🚀 Funcionalidades

### ✅ Onboarding (Primeira Abertura)
- Configuração de nome da lanchonete
- Cadastro de produtos com preços
- Seleção de formas de pagamento
- Tudo salvo em localStorage

### 📊 Registrador de Vendas
- Grid de produtos como botões
- Clique para registrar venda
- Separado por turno (manhã/tarde)
- Tabela com vendas do turno
- **Edição inline** de quantidade e forma de pagamento
- **Deletar** vendas individuais
- Total em tempo real

### 📈 Relatório do Dia
- Seletor de data (últimos 30 dias)
- Tabela: Produto | Qtd | Preço Unit | Subtotal
- Resumo por forma de pagamento
- Total geral do dia
- Botão "Compartilhar WhatsApp" (copia texto formatado)

### ⚙️ Configurações
- Editar nome da lanchonete
- Adicionar/remover produtos
- Gerenciar formas de pagamento
- Reset completo

### 🔌 PWA & Offline
- Funciona 100% offline
- Service Worker com cache
- Instalável em mobile (Add to Home Screen)
- Sincronização automática de histórico (últimos 30 dias)

## 💻 Tecnologia

- **React 18** - UI components
- **Vite** - Build tool rápido
- **CSS Puro** - Sem dependências de UI
- **localStorage** - Persistência de dados
- **Service Worker** - PWA offline
- **Responsivo** - Mobile-first design

## 📦 Como Rodar

```bash
# Dev server na porta 5173
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

Acesse: **http://localhost:5173**

## 📝 Guia de Uso

1. **Primeira abertura:** Preencha nome, produtos e formas de pagamento
2. **Registrar vendas:** Clique no produto, selecione turno/quantidade/pagamento
3. **Editar venda:** Clique na linha da tabela
4. **Deletar venda:** Clique no botão X
5. **Ver relatório:** Selecione a data e visualize resumo
6. **Compartilhar:** Copie para WhatsApp com um clique

## 🌐 Instalação como App

**Android:** Menu > "Add to Home Screen"  
**iOS:** Compartilhar > "Add to Home Screen"

## 💾 Dados

- ✅ 100% local (sem servidor)
- ✅ Offline completo
- ✅ Histórico de 30 dias
- ✅ Privado e seguro

---

**Status:** ✅ Pronto para uso
