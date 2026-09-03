# Transaction Tracker

A small full-stack transaction (income/expense) tracker built with:

- **Frontend:** React (Vite)
- **Backend:** FastAPI
- **Database:** PostgreSQL

The API demonstrates every core REST method — `GET`, `POST`, `PUT`, `PATCH`, `DELETE` —
against a single `transactions` resource.

## Features

- Add a transaction (title, amount, type, category, description)
- List all transactions
- View a single transaction
- Edit a transaction (partial update via `PATCH`)
- Fully replace a transaction (`PUT`)
- Delete a transaction
- Live summary (total income, total expense, balance, count)

## API Endpoints

| Method | Path                     | Purpose                          |
|--------|--------------------------|-----------------------------------|
| GET    | `/transactions`          | List all transactions             |
| GET    | `/transactions/summary`  | Aggregate totals                  |
| GET    | `/transactions/{id}`     | Get one transaction               |
| POST   | `/transactions`          | Create a transaction              |
| PUT    | `/transactions/{id}`     | Replace a transaction entirely    |
| PATCH  | `/transactions/{id}`     | Partially update a transaction    |
| DELETE | `/transactions/{id}`     | Delete a transaction              |

FastAPI auto-generates interactive docs at `http://localhost:8000/docs`.

## Option 1: Run with Docker (easiest)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:8000
- Postgres: localhost:5432 (user: `postgres`, password: `postgres`, db: `transactions_db`)

## Option 2: Run manually

### 1. Start PostgreSQL

Make sure a Postgres instance is running and create a database:

```sql
CREATE DATABASE transactions_db;
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env          # edit DATABASE_URL if needed
uvicorn app.main:app --reload --port 8000
```

Tables are created automatically on startup.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env          # edit VITE_API_URL if needed
npm run dev
```

Open http://localhost:5173.

## Project Structure

```
transaction-app/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI routes (all HTTP methods)
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── schemas.py     # Pydantic schemas
│   │   ├── crud.py        # DB access functions
│   │   └── database.py    # Engine / session setup
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── App.jsx         # Main UI (list, form, edit, delete)
    │   ├── api.js          # fetch calls for every endpoint
    │   ├── App.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    └── Dockerfile
```

## Notes / Next Steps

This is intentionally minimal for learning/demo purposes. For production use you'd
want to add: authentication, pagination on the list endpoint, input validation
messages in the UI, Alembic migrations instead of `create_all`, and tests.
