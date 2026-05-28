# ── Dockerfile (Web — FastAPI) ────────────────────────────────────────────────
# Builds the FastAPI webhook/flow server.
# A separate Dockerfile.worker (below) builds the ARQ worker.

FROM python:3.12-slim

# Don't write .pyc files; send logs straight to stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (none needed beyond Python here, but keep layer cached)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run injects PORT env var; uvicorn binds to it
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
