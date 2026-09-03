from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import engine, get_db

# Create tables on startup (fine for a small demo app; use Alembic for real migrations)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Transaction API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_type(db: Session, type_name: str):
    settings = crud.get_settings(db)
    allowed = [t["name"] for t in settings.transaction_types]
    if type_name not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type '{type_name}'. Allowed types: {', '.join(allowed)}",
        )


@app.get("/")
def root():
    return {"message": "Transaction API is running"}


# ---- GET (list, filterable, sortable, paginated) ----
@app.get("/transactions", response_model=schemas.TransactionListOut)
def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sort_by: str = Query("date", pattern="^(date|amount|title|created_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    items, total = crud.get_transactions(
        db,
        skip=skip,
        limit=limit,
        search=search,
        category=category,
        type=type,
        min_amount=min_amount,
        max_amount=max_amount,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return {"items": items, "total": total, "skip": skip, "limit": limit}


# ---- GET (aggregate, same filters as list) ----
@app.get("/transactions/summary", response_model=schemas.SummaryOut)
def summary(
    search: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    return crud.get_summary(
        db,
        search=search,
        category=category,
        type=type,
        min_amount=min_amount,
        max_amount=max_amount,
        start_date=start_date,
        end_date=end_date,
    )


# ---- GET (single) ----
@app.get("/transactions/{transaction_id}", response_model=schemas.TransactionOut)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_transaction = crud.get_transaction(db, transaction_id)
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction


# ---- POST (create) ----
@app.post(
    "/transactions",
    response_model=schemas.TransactionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    transaction: schemas.TransactionCreate, db: Session = Depends(get_db)
):
    _validate_type(db, transaction.type)
    return crud.create_transaction(db, transaction)


# ---- PUT (full replace) ----
@app.put("/transactions/{transaction_id}", response_model=schemas.TransactionOut)
def replace_transaction(
    transaction_id: int,
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db),
):
    _validate_type(db, transaction.type)
    db_transaction = crud.replace_transaction(db, transaction_id, transaction)
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction


# ---- PATCH (partial update) ----
@app.patch("/transactions/{transaction_id}", response_model=schemas.TransactionOut)
def update_transaction(
    transaction_id: int,
    transaction: schemas.TransactionUpdate,
    db: Session = Depends(get_db),
):
    if transaction.type is not None:
        _validate_type(db, transaction.type)
    db_transaction = crud.update_transaction(db, transaction_id, transaction)
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction


# ---- DELETE ----
@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_transaction = crud.delete_transaction(db, transaction_id)
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return None


# ---- Settings (currency + transaction types) ----
@app.get("/settings", response_model=schemas.SettingsOut)
def read_settings(db: Session = Depends(get_db)):
    return crud.get_settings(db)


@app.put("/settings", response_model=schemas.SettingsOut)
def write_settings(settings: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    if settings.transaction_types is not None and len(settings.transaction_types) == 0:
        raise HTTPException(status_code=400, detail="At least one transaction type is required")
    return crud.update_settings(db, settings)


# ---- Categories ----
@app.get("/categories", response_model=List[schemas.CategoryOut])
def read_categories(db: Session = Depends(get_db)):
    return crud.list_categories(db)


@app.post(
    "/categories", response_model=schemas.CategoryOut, status_code=status.HTTP_201_CREATED
)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    return crud.create_category(db, category)


@app.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    db_category = crud.delete_category(db, category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    return None
