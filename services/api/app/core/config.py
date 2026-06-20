from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

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
    media_bucket: str = Field(default="media-hub", alias="MEDIA_BUCKET")
    media_public_base_url: str = Field(
        default="http://localhost:9100", alias="MEDIA_PUBLIC_BASE_URL"
    )
    media_presign_ttl_seconds: int = Field(default=900, alias="MEDIA_PRESIGN_TTL_SECONDS")
    s3_endpoint_url: str | None = Field(
        default=None, validation_alias=AliasChoices("S3_ENDPOINT_URL", "S3_ENDPOINT")
    )
    s3_public_base_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("S3_PUBLIC_BASE_URL", "S3_PUBLIC_ENDPOINT_URL"),
    )
    s3_bucket: str | None = Field(default=None, alias="S3_BUCKET")
    s3_region: str = Field(default="us-east-1", alias="S3_REGION")
    s3_access_key_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "S3_ACCESS_KEY_ID",
            "S3_ACCESS_KEY",
            "AWS_ACCESS_KEY_ID",
        ),
    )
    s3_secret_access_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "S3_SECRET_ACCESS_KEY",
            "S3_SECRET_KEY",
            "AWS_SECRET_ACCESS_KEY",
        ),
    )
    s3_force_path_style: bool = Field(default=True, alias="S3_FORCE_PATH_STYLE")
    stt_provider: str = Field(default="mock", alias="STT_PROVIDER")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_base_url: str = Field(default="https://api.openai.com/v1", alias="OPENAI_BASE_URL")
    openai_stt_model: str = Field(default="gpt-4o-mini-transcribe", alias="OPENAI_STT_MODEL")
    openai_stt_language: str | None = Field(default="ru", alias="OPENAI_STT_LANGUAGE")
    openai_stt_timeout_seconds: float = Field(default=60.0, alias="OPENAI_STT_TIMEOUT_SECONDS")
    ai_text_provider: str = Field(default="openai", alias="AI_TEXT_PROVIDER")
    ai_text_model: str = Field(default="mock-editor-v1", alias="AI_TEXT_MODEL")
    ai_text_timeout_seconds: float = Field(default=90.0, alias="AI_TEXT_TIMEOUT_SECONDS")
    openai_text_model: str = Field(default="gpt-4.1-mini", alias="OPENAI_TEXT_MODEL")
    embedding_provider: str = Field(default="openai", alias="EMBEDDING_PROVIDER")
    embedding_model: str = Field(default="mock-embedding-v1", alias="EMBEDDING_MODEL")
    openai_embedding_model: str = Field(
        default="text-embedding-3-small", alias="OPENAI_EMBEDDING_MODEL"
    )
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

    @property
    def resolved_media_bucket(self) -> str:
        return self.s3_bucket or self.media_bucket

    @property
    def resolved_s3_public_base_url(self) -> str:
        return (
            self.s3_public_base_url
            or self.s3_endpoint_url
            or self.media_public_base_url
        ).rstrip("/")

    @property
    def s3_upload_enabled(self) -> bool:
        return bool(
            self.s3_bucket
            and self.s3_access_key_id
            and self.s3_secret_access_key
            and (self.s3_public_base_url or self.s3_endpoint_url)
        )

    @property
    def s3_download_enabled(self) -> bool:
        return bool(
            self.s3_bucket
            and self.s3_access_key_id
            and self.s3_secret_access_key
            and (self.s3_endpoint_url or self.s3_public_base_url)
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
