"""Transport-level validation tests that do not require a database."""

import pytest
from pydantic import ValidationError

from app.presentation.http.auth import Credentials


def test_credentials_reject_short_password() -> None:
    with pytest.raises(ValidationError):
        Credentials(email="dev@example.com", password="short")


def test_credentials_normalizes_email_type() -> None:
    credentials = Credentials(email="dev@example.com", password="correct-horse-battery-staple")
    assert str(credentials.email) == "dev@example.com"
