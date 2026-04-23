FROM node:22-alpine

WORKDIR /app

# ── Frontend ────────────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
RUN cd frontend && npm run build

# ── Backend ─────────────────────────────────────────────
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/
COPY backend/tsconfig*.json ./backend/

RUN cd backend && npm ci

COPY backend/src ./backend/src
RUN cd backend && npx prisma generate && npm run build

# Rimuove devDependencies
RUN cd backend && npm prune --omit=dev

# ── Runtime ─────────────────────────────────────────────
ENV NODE_ENV=production
EXPOSE 3000

WORKDIR /app/backend
CMD ["npm", "run", "deploy"]
