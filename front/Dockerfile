# ─────────────────────────────────────────
# Dockerfile — Frontend React (Fate & Grâce)
# Build multi-stage : build → image légère
# ─────────────────────────────────────────

# ── Étape 1 : Build React ──────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les dépendances
COPY package*.json ./
RUN npm install

# Copier le code source
COPY . .

# Variables d'environnement de build
# (pointent vers les services via Nginx)
ENV REACT_APP_API_URL=/api
ENV REACT_APP_WS_URL=ws://localhost/ws

# Build de production
RUN npm run build

# ── Étape 2 : Copie du build vers volume ──
# On utilise une image alpine légère juste
# pour exposer le dossier build via volume
FROM alpine:3.18

WORKDIR /app

COPY --from=builder /app/build ./build

# Ce conteneur sert uniquement à peupler le volume
# Le CMD ne fait rien, Nginx lit le volume directement
CMD ["sh", "-c", "cp -r /app/build/. /shared_build/ && echo 'Frontend build copié.'"]

VOLUME ["/shared_build"]
