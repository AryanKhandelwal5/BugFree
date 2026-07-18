.DEFAULT_GOAL := help

.PHONY: help up down api-install web-install api-test api-lint api-migrate web-check check

help:
	@echo "Targets: up, down, api-install, web-install, api-test, api-lint, web-check, check"

up:
	docker compose up --build

down:
	docker compose down

api-install:
	cd services/api && python -m pip install -e '.[dev]'

web-install:
	cd apps/web && npm ci

api-test:
	cd services/api && python -m pytest --cov=app --cov-fail-under=90

api-migrate:
	cd services/api && alembic upgrade head

api-lint:
	cd services/api && ruff check . && black --check . && mypy app

web-check:
	cd apps/web && npm run check && npm run test:coverage

check: api-lint api-test web-check
