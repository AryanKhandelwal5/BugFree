FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN addgroup --system codepilot && adduser --system --ingroup codepilot codepilot
COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
RUN pip install .
USER codepilot
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.presentation.http.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
