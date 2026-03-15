from fastapi import FastAPI
from app.api.routes import router as core_router
from app.api.monitoring import router as monitoring_router
from app.config import settings

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.include_router(core_router)
app.include_router(monitoring_router)