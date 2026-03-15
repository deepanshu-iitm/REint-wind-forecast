from fastapi import APIRouter
from app.config import settings

router = APIRouter()


@router.get("/")
def root() -> dict:
    return {
        "message": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
    }


@router.get("/health")
def health_check() -> dict:
    return {"status": "ok"}