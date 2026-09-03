const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

function toQuery(params = {}) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      usp.set(key, value)
    }
  })
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

// GET /transactions — supports search, category, type, amount range,
// date range, sorting, and skip/limit pagination.
export function getTransactions(filters = {}) {
  return fetch(`${API_URL}/transactions${toQuery(filters)}`).then(handle)
}

// GET /transactions/summary — accepts the same filters as getTransactions.
export function getSummary(filters = {}) {
  return fetch(`${API_URL}/transactions/summary${toQuery(filters)}`).then(handle)
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

// ---- Settings (currency + transaction types) ----

export function getSettings() {
  return fetch(`${API_URL}/settings`).then(handle)
}

export function updateSettings(data) {
  return fetch(`${API_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handle)
}

// ---- Categories ----

export function getCategories() {
  return fetch(`${API_URL}/categories`).then(handle)
}

export function createCategory(name) {
  return fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }).then(handle)
}

export function deleteCategory(id) {
  return fetch(`${API_URL}/categories/${id}`, {
    method: 'DELETE',
  }).then(handle)
}
