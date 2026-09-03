from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .models import TransactionType


class TransactionBase(BaseModel):
    title: str
    amount: float = Field(..., gt=0)
    type: TransactionType
    category: Optional[str] = None
    description: Optional[str] = None


class TransactionCreate(TransactionBase):
    """Used for POST (create) and PUT (full replace)."""

    pass


class TransactionUpdate(BaseModel):
    """Used for PATCH (partial update) — every field optional."""

    title: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[TransactionType] = None
    category: Optional[str] = None
    description: Optional[str] = None


class TransactionOut(TransactionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SummaryOut(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    count: int
