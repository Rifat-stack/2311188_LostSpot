"""
get_group_or_404: used by every route with {group_id} in its URL.
"""

from fastapi import Depends, HTTPException
from sqlmodel import Session

from app.database import get_db
from app.groups import repository
from app.groups.models import Group


def get_group_or_404(group_id: int, db: Session = Depends(get_db)) -> Group:
    group = repository.find_group(db, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail=f"No group with id {group_id}")
    return group
