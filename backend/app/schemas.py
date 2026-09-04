from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class TransactionBase(BaseModel):
    title: str
    amount: float = Field(..., gt=0)
    type: str
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None


class TransactionCreate(TransactionBase):
    """Used for POST (create) and PUT (full replace)."""

    pass


class TransactionUpdate(BaseModel):
    """Used for PATCH (partial update) — every field optional."""

    title: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None


class TransactionOut(BaseModel):
    id: int
    title: str
    amount: float
    type: str
    category: Optional[str] = None
    description: Optional[str] = None
    date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TransactionListOut(BaseModel):
    items: List[TransactionOut]
    total: int
    skip: int
    limit: int


class SummaryOut(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    count: int


class TransactionTypeConfig(BaseModel):
    name: str
    direction: Literal["in", "out"]


class SettingsOut(BaseModel):
    currency_code: str
    currency_symbol: str
    transaction_types: List[TransactionTypeConfig]

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    currency_code: Optional[str] = None
    currency_symbol: Optional[str] = None
    transaction_types: Optional[List[TransactionTypeConfig]] = None


class CategoryCreate(BaseModel):
    name: str


class CategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
