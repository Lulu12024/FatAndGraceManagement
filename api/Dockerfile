
FROM python:3.11-slim

# Variables d'environnement Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Répertoire de travail
WORKDIR /app

# Dépendances système (PostgreSQL client, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collecter les fichiers statiques
RUN python manage.py collectstatic --noinput || true

# Exposer le port Gunicorn
EXPOSE 8000
