# Single Render service: build the React SPA, then serve it and the API from FastAPI
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_SAME_ORIGIN=true
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=web /web/dist /app/static
RUN useradd --create-home appuser && chown -R appuser:appuser /app && chmod +x docker-entrypoint.sh
USER appuser
EXPOSE 8000
CMD ["./docker-entrypoint.sh"]
