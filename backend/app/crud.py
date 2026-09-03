from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas


def get_transactions(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Transaction)
        .order_by(models.Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_transaction(db: Session, transaction_id: int):
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id)
        .first()
    )


def create_transaction(db: Session, transaction: schemas.TransactionCreate):
    db_transaction = models.Transaction(**transaction.dict())
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
    for key, value in transaction.dict().items():
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


def get_summary(db: Session):
    income = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0))
        .filter(models.Transaction.type == "credit")
        .scalar()
    )
    expense = (
        db.query(func.coalesce(func.sum(models.Transaction.amount), 0))
        .filter(models.Transaction.type == "debit")
        .scalar()
    )
    count = db.query(models.Transaction).count()
    return {
        "total_income": income,
        "total_expense": expense,
        "balance": income - expense,
        "count": count,
    }
