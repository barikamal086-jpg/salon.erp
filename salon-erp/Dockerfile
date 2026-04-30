FROM node:22

# Set working directory to project root
WORKDIR /app

# Copy package files
COPY package.json ./
COPY backend/package.json backend/package-lock.json ./backend/

# Create backend/frontend directory structure for app.js to find frontend
# app.js uses: path.join(__dirname, './frontend') where __dirname is /app/backend
# So frontend must be at /app/backend/frontend/

# Copy frontend into the backend directory (where app.js expects it)
COPY frontend/ ./backend/frontend/

# Change to backend directory for installation and running
WORKDIR /app/backend

# Install dependencies
RUN npm install

# Copy backend source code (includes app.js, database.js, routes, models, etc.)
COPY backend/ ./

# Verify that database.js exists and contains PostgreSQL code
RUN test -f ./database.js && grep -q "Pool.*require.*pg" ./database.js || (echo "ERROR: PostgreSQL database.js not found or invalid!" && exit 1)

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "app.js"]
