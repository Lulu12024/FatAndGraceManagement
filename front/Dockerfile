
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les dépendances
COPY package*.json ./
RUN npm install


COPY . .


ENV REACT_APP_API_URL=/api
ENV REACT_APP_WS_URL=ws://localhost/ws

# Build de production
RUN npm run build

FROM alpine:3.18

WORKDIR /app

COPY --from=builder /app/build ./build

CMD ["sh", "-c", "cp -r /app/build/. /shared_build/ && echo 'Frontend build copié.'"]

VOLUME ["/shared_build"]
