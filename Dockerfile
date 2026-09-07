# ---------------------------------------------------------------------
# Stage 1: build the React (Vite) frontend
# ---------------------------------------------------------------------
FROM node:20-slim AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------
# Stage 2: Python API, serving the built frontend as static files
# ---------------------------------------------------------------------
FROM python:3.12-slim

WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend-build /frontend/dist ./app/static_frontend

WORKDIR /app/backend/app

ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["sh", "-c", "gunicorn --chdir /app/backend/app app:app --bind 0.0.0.0:${PORT:-8080} --workers 2 --threads 4 --timeout 120"]
