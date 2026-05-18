

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME:    str = "Intelligent Court Scheduling System"
    APP_VERSION: str = "1.0.0"
    DEBUG:       bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/court_schedule_db"

    # JWT
    SECRET_KEY:                  str = "changethisinproduction"
    ALGORITHM:                   str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # ML Model
    MODEL_PATH: str = "models/rf_duration_model.pkl"

    class Config:
        env_file = ".env"
        extra   = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
