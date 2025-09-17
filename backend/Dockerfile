FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.8.3 \
    POETRY_VIRTUALENVS_IN_PROJECT=true

WORKDIR /app

# System deps (add build-essential if needed for native deps)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python - --version ${POETRY_VERSION}
ENV PATH="/root/.local/bin:${PATH}"

# Copy dependency metadata first (leverage Docker layer caching)
COPY pyproject.toml poetry.lock ./

# Install deps (no root package install needed)
RUN poetry install --no-root --no-interaction --no-ansi

# Copy application code
COPY app ./app

EXPOSE 8000

# Default command (overridden in docker-compose for reload dev)
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

