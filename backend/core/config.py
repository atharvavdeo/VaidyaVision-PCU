import os
from dataclasses import dataclass


@dataclass
class Settings:
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "./data/vaidyavision.db")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    APP_URL: str = os.getenv("APP_URL", "http://localhost:8000")
    BRIDGE_NEXT_API_URL: str = os.getenv("BRIDGE_NEXT_API_URL", "http://localhost:3000/api")
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
    CLERK_JWKS_URL: str = os.getenv("CLERK_JWKS_URL", "https://api.clerk.dev/v1/jwks")


settings = Settings()
