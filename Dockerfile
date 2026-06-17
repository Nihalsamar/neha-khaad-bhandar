# Production image for Neha Khaad Bhandar
FROM node:20-slim

WORKDIR /app

# Install dependencies (better-sqlite3 needs build tools to compile native bindings)
COPY package*.json ./
RUN apt-get update && apt-get install -y python3 make g++ \
    && npm install --omit=dev \
    && apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY . .

# Store the database on a mounted volume in production so data persists
ENV DB_PATH=/data/store.db
ENV PORT=3000
EXPOSE 3000

# Seed (idempotent) then start
CMD ["sh", "-c", "node database/seed.js && node server.js"]
