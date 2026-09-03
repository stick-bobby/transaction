const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

// GET /transactions
export function getTransactions() {
  return fetch(`${API_URL}/transactions`).then(handle)
}

// GET /transactions/summary
export function getSummary() {
  return fetch(`${API_URL}/transactions/summary`).then(handle)
}

// GET /transactions/{id}
export function getTransaction(id) {
  return fetch(`${API_URL}/transactions/${id}`).then(handle)
}

// POST /transactions  (create)
export function createTransaction(data) {
  return fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle)
}

// PUT /transactions/{id}  (full replace)
export function replaceTransaction(id, data) {
  return fetch(`${API_URL}/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle)
}

// PATCH /transactions/{id}  (partial update)
export function updateTransaction(id, data) {
  return fetch(`${API_URL}/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle)
}

// DELETE /transactions/{id}
export function deleteTransaction(id) {
  return fetch(`${API_URL}/transactions/${id}`, {
    method: 'DELETE',
  }).then(handle)
}
