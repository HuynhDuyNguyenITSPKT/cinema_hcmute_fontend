# Use Node
FROM node:20-alpine

# Workdir
WORKDIR /app

# Copy package trước để cache
COPY package*.json ./

# Install deps
RUN npm install

# Copy source
COPY . .

# Expose port Vite
EXPOSE 5173

# Run dev server
CMD ["npm", "run", "dev"]