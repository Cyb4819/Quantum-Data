from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

cwd = os.path.dirname(__file__)
backend_env = os.path.join(cwd, "..", ".env")
root_env = os.path.join(cwd, "..", "..", ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)
elif os.path.exists(root_env):
    load_dotenv(root_env)


class Settings(BaseSettings):
    ENV: str = "development"
    DATABASE_URL: Optional[str] = None
    POSTGRES_HOST: Optional[str] = None
    POSTGRES_PORT: Optional[int] = 5432
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None

    MYSQL_HOST: Optional[str] = None
    MYSQL_PORT: Optional[int] = 3306
    MYSQL_USER: Optional[str] = None
    MYSQL_PASSWORD: Optional[str] = None
    MYSQL_DB: Optional[str] = None

    GROQ_API_KEY: Optional[str] = None
    MODEL_NAME: str = "openai/gpt-oss-20b"

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_UNAUTHENTICATED: int = 10
    RATE_LIMIT_AUTHENTICATED: int = 100

    class Config:
        env_file = None
        env_file_encoding = "utf-8"


settings = Settings()
print("Groq configured:", bool(settings.GROQ_API_KEY))
print("Model:", settings.MODEL_NAME)
