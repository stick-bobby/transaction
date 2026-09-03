from datetime import datetime
from typing import Optional

from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session

from . import models, schemas

SORTABLE_COLUMNS = {
    "date": models.Transaction.date,
    "amount": models.Transaction.amount,
    "title": models.Transaction.title,
    "created_at": models.Transaction.created_at,
}


def _filtered_query(
    db: Session,
    search: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    query = db.query(models.Transaction)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                models.Transaction.title.ilike(like),
                models.Transaction.description.ilike(like),
            )
        )
    if category:
        query = query.filter(models.Transaction.category == category)
    if type:
        query = query.filter(models.Transaction.type == type)
    if min_amount is not None:
        query = query.filter(models.Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(models.Transaction.amount <= max_amount)
    if start_date is not None:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date is not None:
        query = query.filter(models.Transaction.date <= end_date)

    return query


def get_transactions(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sort_by: str = "date",
    sort_order: str = "desc",
):
    query = _filtered_query(
        db, search, category, type, min_amount, max_amount, start_date, end_date
    )
    total = query.count()

    sort_column = SORTABLE_COLUMNS.get(sort_by, models.Transaction.date)
    order_fn = asc if sort_order == "asc" else desc
    query = query.order_by(order_fn(sort_column))

    items = query.offset(skip).limit(limit).all()
    return items, total


def get_transaction(db: Session, transaction_id: int):
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
        .first()
    )


def create_transaction(db: Session, transaction: schemas.TransactionCreate):
    data = transaction.dict()
    if not data.get("date"):
        data["date"] = datetime.utcnow()
    db_transaction = models.Transaction(**data)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


def replace_transaction(
    db: Session, transaction_id: int, transaction: schemas.TransactionCreate
):
    """Full replace — used by PUT. Every field is overwritten."""
    db_transaction = get_transaction(db, transaction_id)
    if not db_transaction:
        return None
    data = transaction.dict()
    if not data.get("date"):
        data["date"] = datetime.utcnow()
    for key, value in data.items():
        setattr(db_transaction, key, value)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


def update_transaction(
    db: Session, transaction_id: int, transaction: schemas.TransactionUpdate
):
    """Partial update — used by PATCH. Only provided fields change."""
    db_transaction = get_transaction(db, transaction_id)
    if not db_transaction:
        return None
    update_data = transaction.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_transaction, key, value)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


def delete_transaction(db: Session, transaction_id: int):
    db_transaction = get_transaction(db, transaction_id)
    if not db_transaction:
        return None
    db.delete(db_transaction)
    db.commit()
    return db_transaction


def get_summary(
    db: Session,
    search: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
):
    query = _filtered_query(
        db, search, category, type, min_amount, max_amount, start_date, end_date
    )
    rows = query.with_entities(
        models.Transaction.type, models.Transaction.amount
    ).all()

    settings = get_settings(db)
    direction_map = {t["name"]: t["direction"] for t in settings.transaction_types}

    income = sum(amount for type_name, amount in rows if direction_map.get(type_name) == "in")
    expense = sum(amount for type_name, amount in rows if direction_map.get(type_name) == "out")

    return {
        "total_income": income,
        "total_expense": expense,
        "balance": income - expense,
        "count": len(rows),
    }


# ---- Settings (singleton row) ----

def get_settings(db: Session) -> models.Settings:
    settings = db.query(models.Settings).filter(models.Settings.id == 1).first()
    if not settings:
        settings = models.Settings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_settings(db: Session, update: schemas.SettingsUpdate) -> models.Settings:
    settings = get_settings(db)
    data = update.dict(exclude_unset=True)
    if "transaction_types" in data:
        data["transaction_types"] = [t for t in data["transaction_types"]]
    for key, value in data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings


# ---- Categories ----

def list_categories(db: Session):
    return db.query(models.Category).order_by(models.Category.name).all()


def create_category(db: Session, category: schemas.CategoryCreate):
    existing = (
        db.query(models.Category)
        .filter(models.Category.name.ilike(category.name))
        .first()
    )
    if existing:
        return existing
    db_category = models.Category(name=category.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def delete_category(db: Session, category_id: int):
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        return None
    db.delete(db_category)
    db.commit()
    return db_category
