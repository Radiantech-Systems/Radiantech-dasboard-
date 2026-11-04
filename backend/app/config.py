"""
Centralized application configuration.
Reads from environment variables / .env so the same code works
locally, in Docker, and in production without code changes.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    POSTGRES_USER: str = "telemetry"
    POSTGRES_PASSWORD: str = "telemetry_pw"
    POSTGRES_DB: str = "telemetry_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    DEVICE_OFFLINE_TIMEOUT_SECONDS: int = 15
    API_KEY: str = ""  # empty = auth disabled (local dev only)
    AUTH_USERNAME: str = "Radiantech-Dashboard"
    AUTH_PASSWORD_HASH: str = ""
    AUTH_IT_USERNAME: str = "IT"
    AUTH_IT_PASSWORD_HASH: str = ""
    AUTH_USER_USERNAME: str = "User"
    AUTH_USER_PASSWORD_HASH: str = ""
    AUTH_SESSION_SECRET: str = ""
    FOOTAGE_STORAGE_DIR: str = "/app/footage_storage"
    AI_SNAPSHOT_STORAGE_DIR: str = "/app/ai_snapshot_storage"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
