FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (using npm install to handle lockfile mismatch)
# Ensure typescript (now in dependencies) is installed
RUN npm install

# Copy source code
COPY . .

# Build the application (tsc)
RUN npm run build

# Expose port (Railway sets PORT env var)
ENV PORT=3000
EXPOSE ${PORT}

# Start the server
CMD ["npm", "start"]
