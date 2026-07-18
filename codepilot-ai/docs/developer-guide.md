# Developer guide

Install Python 3.12 and Node 22, copy `.env.example` to `.env`, then run `make api-install`, `make web-install`, and `make check`. Run the services with `make up`.

The API is organized by layer under `services/api/app`: `domain` has stable business contracts, `application` holds use cases, `infrastructure` supplies adapters, and `presentation` owns FastAPI concerns. Add a feature as a vertical slice with unit tests for domain/application code and integration tests for HTTP and adapters.

Identity endpoints are under `/api/v1/auth`; refresh tokens are HttpOnly, SameSite cookies and are rotated on every refresh. Organization endpoints require a bearer access token and enforce membership roles in the application service. Rate-limit keys are scoped to the client address and stored in Redis; do not replace this with process-local state in deployed environments.

The generated API contract is available at `/docs` and `/openapi.json`. Identity endpoints are `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, and `POST /api/v1/auth/logout`. Tenant endpoints are `POST/GET /api/v1/organizations` and `POST /api/v1/organizations/{organization_id}/members`.

Use `pre-commit install` after installing the development dependencies. Pull requests must satisfy formatting, static analysis, tests, and the 90% coverage gate.
