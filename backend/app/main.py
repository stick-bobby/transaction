from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import engine, get_db

# Create tables on startup (fine for a small demo app; use Alembic for real migrations)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Transaction API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Transaction API is running"}


# ---- GET (list) ----
@app.get("/transactions", response_model=List[schemas.TransactionOut])
def list_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_transactions(db, skip, limit)


# ---- GET (aggregate) ----
@app.get("/transactions/summary", response_model=schemas.SummaryOut)
def summary(db: Session = Depends(get_db)):
    return crud.get_summary(db)


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
    return crud.create_transaction(db, transaction)


# ---- PUT (full replace) ----
@app.put("/transactions/{transaction_id}", response_model=schemas.TransactionOut)
def replace_transaction(
    transaction_id: int,
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db),
):
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
