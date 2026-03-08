# Ovalens API — production image for Railway (or any Docker host).
# Build context: apps/api (set Root Directory in Railway to OvalensPlanner/apps/api or apps/api).
# Runs migrations on startup, then uvicorn.

FROM python:3.12-slim

WORKDIR /app

# Install dependencies (no dev deps)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application and migrations
COPY app ./app
COPY scripts ./scripts
COPY alembic ./alembic
COPY alembic.ini .

# Migrations use DATABASE_URL (sync Postgres URL); app uses same env.
# Run migrations then start the API. PORT is set by Railway (default 8000).
ENV PORT=8000
EXPOSE 8000

CMD set -e && alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
