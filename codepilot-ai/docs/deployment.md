# Deployment guide

Build immutable images from the service Dockerfiles and inject configuration using a secret manager, not image layers or source control. Use managed PostgreSQL, Redis, and Qdrant with TLS, backups, least-privilege credentials, and network policies. Route `/api/v1/health/live` to liveness probes and `/api/v1/health/ready` to readiness probes. Scrape `/metrics` only from the observability network.

Set `ENVIRONMENT=production`, explicit `ALLOWED_ORIGINS`, and a non-debug log level. Terminate TLS at the ingress, enforce HTTPS, set database pool limits appropriate to the worker count, and deploy at least two API replicas behind a load balancer.

