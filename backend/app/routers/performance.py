"""GET /performance — live-only CPU/GPU/RAM/Storage metrics (no history)."""
from typing import Optional
from fastapi import APIRouter, Query, Depends

from app.routers.system_info import _resolve
from app.security import require_page_access

router = APIRouter(tags=["performance"])


@router.get("/performance")
def get_performance(device_id: Optional[str] = Query(None), _auth=Depends(require_page_access("system_information"))):
    live = _resolve(device_id)
    return {
        "cpu": live.get("cpu", {}),
        "gpu": live.get("gpu", {}),
        "memory": live.get("memory", {}),
        "storage": live.get("storage", {}),
    }
