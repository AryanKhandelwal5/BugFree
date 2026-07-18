# CodePilot AI

CodePilot AI is an autonomous software-engineering platform designed around clear trust boundaries: a browser workspace, a typed API, domain-oriented services, and isolated integrations. This repository is a monorepo; Milestone 1 delivers the production platform foundation.

## Milestone 1: platform foundation

- Next.js workspace shell and FastAPI service with versioned OpenAPI
- Health, readiness, Prometheus metrics, JSON logs, request correlation, graceful shutdown
- Dependency-injected configuration and feature flags
- Multi-tenant identity: Argon2id passwords, JWT access tokens, rotated refresh sessions, organization membership, RBAC boundaries, audit events, and Redis rate limiting
- Docker Compose services with health checks, CI, pre-commit, linting, formatting, typing, and coverage gates

## Quick start

```bash
cp .env.example .env
make up
```

Open `http://localhost:3000`; API docs are at `http://localhost:8000/docs`. Run `make check` before submitting a change.

## Documentation

- [Architecture](docs/architecture.md)
- [Developer guide](docs/developer-guide.md)
- [Deployment guide](docs/deployment.md)
- [Contribution guide](CONTRIBUTING.md)

## Repository layout

```text
apps/web/                 Next.js presentation application
services/api/             FastAPI clean-architecture service
docs/                     Architecture and operational documentation
.github/workflows/        CI quality gates
.devcontainer/            Reproducible development environment
```

## Commit convention

Use Conventional Commits, e.g. `feat(api): add repository health probe` or `fix(web): preserve request identifier`.
