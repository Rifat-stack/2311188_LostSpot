# App entry point: creates the FastAPI app, mounts the items router, maps errors to JSON and serves the frontend build.
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import BACKEND_DIR
from app.database import create_db_and_tables
from app.items.router import router as items_router
from app.items.service import ItemRuleError

logger = logging.getLogger("lostspot")

app = FastAPI(
    title="LostSpot API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

app.include_router(items_router)

# Run at import (not in a lifespan hook) so it also works on serverless hosts.
create_db_and_tables()


@app.exception_handler(ItemRuleError)
async def item_rule_error(request: Request, exc: ItemRuleError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


# Log the real error, but never send stack traces or database details to the client.
@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


FRONTEND_DIR = BACKEND_DIR.parent / "frontend" / "dist"

# dist/ only exists after `npm run build`; in dev the Vite server serves the UI.
# fallback="index.html" lets React Router handle client-side routes such as /items/1.
if FRONTEND_DIR.is_dir():
    app.frontend("/", directory=FRONTEND_DIR, fallback="index.html")
