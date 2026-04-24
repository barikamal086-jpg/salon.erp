FROM node:22-alpine

WORKDIR /app

# Copiar todo o repositório
COPY . .

# Ir para backend e instalar dependências
WORKDIR /app/backend

RUN npm install

# Expor porta
EXPOSE 8080

# Iniciar aplicação
CMD ["node", "app.js"]
