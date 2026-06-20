from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from argon2.low_level import Type

_password_hasher = PasswordHasher(type=Type.ID)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError):
        return False


def generate_secret(bytes_count: int = 32) -> str:
    return secrets.token_urlsafe(bytes_count)


def hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def hash_optional_secret(value: str | None) -> str | None:
    if not value:
        return None
    return hash_secret(value)


def expires_in(hours: int) -> datetime:
    return utc_now() + timedelta(hours=hours)


def is_past(value: datetime) -> bool:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value <= utc_now()


def slugify(value: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    base = re.sub(r"-+", "-", base).strip("-")
    return base or "workspace"
