FROM node:20-alpine

WORKDIR /app

# Install deps first (leverage cache). If package files missing, build still works with volume mount.
COPY package.json package-lock.json* ./
RUN if [ -f package.json ]; then npm ci || npm install; fi

# Copy rest (for prod builds; dev uses bind mount)
COPY . .

EXPOSE 3000
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "run", "dev"]

