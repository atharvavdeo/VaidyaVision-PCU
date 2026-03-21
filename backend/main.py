import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .routers import hospitals, memberships, cases, artifacts, patients, report_templates, bridge

app = FastAPI(title="VaidyaVision API", version="2.0.0", description="Backend split for VaidyaVision")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("./public/uploads", exist_ok=True)
os.makedirs("./public/heatmaps", exist_ok=True)
os.makedirs("./public/uploads/prescriptions", exist_ok=True)
app.mount("/public", StaticFiles(directory="./public"), name="public")

# SQL-backed routes implemented as part of the restructuring plan.
app.include_router(hospitals.router)
app.include_router(memberships.router)
app.include_router(cases.router)
app.include_router(artifacts.router)
app.include_router(patients.router)
app.include_router(report_templates.router)

# Transitional bridge for remaining routes while migration continues.
app.include_router(bridge.router)


@app.get("/health")
def health():
    return {"status": "online", "service": "VaidyaVision API v2"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
