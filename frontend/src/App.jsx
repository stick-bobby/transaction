import { useEffect, useState } from 'react'
import {
  createTransaction,
  deleteTransaction,
  getSummary,
  getTransactions,
  updateTransaction,
} from './api'

const emptyForm = { title: '', amount: '', type: 'credit', category: '', description: '' }

function App() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadAll() {
    try {
      setLoading(true)
      const [tx, sum] = await Promise.all([getTransactions(), getSummary()])
      setTransactions(tx)
      setSummary(sum)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, amount: parseFloat(form.amount) }
    try {
      if (editingId) {
        // Partial update via PATCH
        await updateTransaction(editingId, payload)
      } else {
        // Create via POST
        await createTransaction(payload)
      }
      setForm(emptyForm)
      setEditingId(null)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleEdit(t) {
    setEditingId(t.id)
    setForm({
      title: t.title,
      amount: t.amount,
      type: t.type,
      category: t.category || '',
      description: t.description || '',
    })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return
    try {
      await deleteTransaction(id)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  return (
    <div className="container">
      <h1>💳 Transaction Tracker</h1>

      {error && <div className="error">{error}</div>}

      {summary && (
        <div className="summary">
          <div className="card income">
            <span>Income</span>
            <strong>${summary.total_income.toFixed(2)}</strong>
          </div>
          <div className="card expense">
            <span>Expense</span>
            <strong>${summary.total_expense.toFixed(2)}</strong>
          </div>
          <div className="card balance">
            <span>Balance</span>
            <strong>${summary.balance.toFixed(2)}</strong>
          </div>
          <div className="card count">
            <span>Count</span>
            <strong>{summary.count}</strong>
          </div>
        </div>
      )}

      <form className="tx-form" onSubmit={handleSubmit}>
        <input
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
          required
        />
        <input
          name="amount"
          type="number"
          step="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange}
          required
        />
        <select name="type" value={form.type} onChange={handleChange}>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
        <input
          name="category"
          placeholder="Category"
          value={form.category}
          onChange={handleChange}
        />
        <input
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
        />
        <div className="form-actions">
          <button type="submit">{editingId ? 'Update' : 'Add'}</button>
          {editingId && (
            <button type="button" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className={t.type}>
                <td>{t.title}</td>
                <td>${t.amount.toFixed(2)}</td>
                <td>{t.type}</td>
                <td>{t.category || '-'}</td>
                <td>
                  <button onClick={() => handleEdit(t)}>Edit</button>
                  <button onClick={() => handleDelete(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#888' }}>
                  No transactions yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default App
