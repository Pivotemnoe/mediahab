from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = Field(default="local", alias="APP_ENV")
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    database_url: str = Field(
        default="postgresql+asyncpg://media_hub:media_hub@localhost:5432/media_hub",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    session_cookie_name: str = Field(default="tmh_session", alias="SESSION_COOKIE_NAME")
    csrf_cookie_name: str = Field(default="tmh_csrf", alias="CSRF_COOKIE_NAME")
    csrf_header_name: str = Field(default="X-CSRF-Token", alias="CSRF_HEADER_NAME")
    session_cookie_secure: bool = Field(default=True, alias="SESSION_COOKIE_SECURE")
    session_ttl_hours: int = Field(default=24 * 14, alias="SESSION_TTL_HOURS")
    admin_api_token: str = Field(default="local-admin-token", alias="ADMIN_API_TOKEN")
    auth_rate_limit_attempts: int = Field(default=5, alias="AUTH_RATE_LIMIT_ATTEMPTS")
    auth_rate_limit_window_seconds: int = Field(
        default=60, alias="AUTH_RATE_LIMIT_WINDOW_SECONDS"
    )
    cors_origins_raw: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins_raw.split(",")
            if origin.strip()
        ]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
