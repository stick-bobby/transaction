from sqlalchemy import JSON, Column, DateTime, Float, Integer, String
from sqlalchemy.sql import func

from .database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    # Free-form string instead of a fixed DB enum, so new types can be
    # added at runtime via /settings without a schema migration.
    type = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True, index=True)
    description = Column(String, nullable=True)
    # The date the transaction actually happened (user-editable). Defaults
    # to "now" at creation time but can be backdated.
    date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Category(Base):
    """User-managed category list, editable via /categories."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


DEFAULT_TRANSACTION_TYPES = [
    {"name": "credit", "direction": "in"},
    {"name": "debit", "direction": "out"},
]


class Settings(Base):
    """
    Singleton row (id is always 1) holding app-wide configuration:
    currency display, and the list of allowed transaction types with
    their direction (in = adds to balance, out = subtracts).
    """

    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    currency_code = Column(String, nullable=False, default="USD")
    currency_symbol = Column(String, nullable=False, default="$")
    transaction_types = Column(JSON, nullable=False, default=lambda: DEFAULT_TRANSACTION_TYPES)
