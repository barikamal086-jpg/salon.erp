FROM node:22

WORKDIR /app

# Copiar apenas os arquivos essenciais
COPY package.json ./
COPY backend/package.json backend/package-lock.json ./backend/

# Instalar dependências do backend
WORKDIR /app/backend
RUN npm install

# Copiar código do backend
COPY backend/ ./

# Copiar frontend
COPY frontend/ ./frontend/

# Expor porta
EXPOSE 8080

# Iniciar aplicação
CMD ["node", "app.js"]
