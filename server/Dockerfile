# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Expose port (important)
EXPOSE 5000

# Start app
CMD ["npm", "start"]