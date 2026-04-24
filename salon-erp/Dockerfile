FROM node:22

WORKDIR /app

# Copiar backend
COPY ./backend /app

# Copiar frontend para dentro do app
COPY ./frontend /app/frontend

# Instalar dependências
RUN npm install

# Expor porta
EXPOSE 8080

# Iniciar aplicação
CMD ["node", "app.js"]
