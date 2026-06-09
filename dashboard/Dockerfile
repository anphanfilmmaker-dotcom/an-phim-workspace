# Stage 1: Build the React frontend
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run the Express backend
FROM node:20
WORKDIR /app
COPY package*.json ./
# Install only production dependencies (no devDependencies, but including pg, sqlite3, etc.)
RUN npm install --omit=dev
# Copy server script
COPY server.cjs ./
# Copy compiled frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.cjs"]
