import logging
from pydantic_settings import BaseSettings

log = logging.getLogger(__name__)

_DEFAULT_SECRET = "change-this-in-production-use-random-32-chars"


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./platform.db"
    SECRET_KEY: str = _DEFAULT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # AI Provider keys (platform-level fallback defaults)
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()


def validate_settings():
    """Call at startup — warns or errors on insecure configuration."""
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    if settings.SECRET_KEY == _DEFAULT_SECRET:
        if is_sqlite:
            log.warning(
                "SECRET_KEY is set to the default value. "
                "Set a random SECRET_KEY env var before deploying to production."
            )
        else:
            raise RuntimeError(
                "SECRET_KEY must be changed from the default before running in production. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
