# Use official Node base image
FROM node:20-alpine

# Set container working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install packages
RUN npm install

# Copy application source code
COPY . .

# Expose Vite dev server port
EXPOSE 3000

# Start server configured for port 3000 and accessible externally
CMD ["npm", "run", "dev", "--", "--port", "3000", "--host", "0.0.0.0"]
