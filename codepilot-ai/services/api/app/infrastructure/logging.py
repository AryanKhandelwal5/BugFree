"""Structured JSON logging without secret-bearing configuration dumps."""

import json
import logging
from datetime import UTC, datetime
from typing import Any


class JsonFormatter(logging.Formatter):
    """Formats application records as machine-readable JSON."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if request_id := getattr(record, "request_id", None):
            payload["request_id"] = request_id
        return json.dumps(payload, default=str)


def configure_logging(level: str) -> None:
    """Configure process logging exactly once at application start."""
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())

