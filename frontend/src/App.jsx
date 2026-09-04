import { useEffect, useMemo, useState } from 'react'
import {
  createCategory,
  createTransaction,
  deleteCategory,
  deleteTransaction,
  getCategories,
  getSettings,
  getSummary,
  getTransactions,
  updateSettings,
  updateTransaction,
} from './api'

const emptyForm = { title: '', amount: '', type: '', category: '', description: '', date: '' }
const defaultFilters = {
  search: '',
  category: '',
  type: '',
  minAmount: '',
  maxAmount: '',
  startDate: '',
  endDate: '',
  sort: 'date:desc',
}
const PAGE_SIZE = 10

const SORT_OPTIONS = [
  { value: 'date:desc', label: 'Newest first' },
  { value: 'date:asc', label: 'Oldest first' },
  { value: 'amount:desc', label: 'Amount: high to low' },
  { value: 'amount:asc', label: 'Amount: low to high' },
  { value: 'title:asc', label: 'Title: A to Z' },
]

function App() {
  const [transactions, setTransactions] = useState([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)

  const [summary, setSummary] = useState(null)
  const [settings, setSettings] = useState(null)
  const [categories, setCategories] = useState([])

  const [filters, setFilters] = useState(defaultFilters)

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  const [showSettings, setShowSettings] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState(null)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeDirection, setNewTypeDirection] = useState('out')
  const [newCategoryName, setNewCategoryName] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const directionByType = useMemo(() => {
    const map = {}
    ;(settings?.transaction_types || []).forEach((t) => {
      map[t.name] = t.direction
    })
    return map
  }, [settings])

  function currentApiFilters() {
    const [sortBy, sortOrder] = filters.sort.split(':')
    return {
      search: filters.search,
      category: filters.category,
      type: filters.type,
      min_amount: filters.minAmount,
      max_amount: filters.maxAmount,
      start_date: filters.startDate,
      end_date: filters.endDate,
      sort_by: sortBy,
      sort_order: sortOrder,
      skip,
      limit: PAGE_SIZE,
    }
  }

  async function loadConfig() {
    try {
      const [settingsData, categoriesData] = await Promise.all([getSettings(), getCategories()])
      setSettings(settingsData)
      setCategories(categoriesData)
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadData() {
    try {
      setLoading(true)
      const apiFilters = currentApiFilters()
      const [txPage, sum] = await Promise.all([getTransactions(apiFilters), getSummary(apiFilters)])
      setTransactions(txPage.items)
      setTotal(txPage.total)
      setSummary(sum)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  // Debounce so typing in search/amount fields doesn't fire a request per keystroke
  useEffect(() => {
    const handle = setTimeout(loadData, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, skip])

  function updateFilter(key, value) {
    setSkip(0)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  function clearFilters() {
    setSkip(0)
    setFilters(defaultFilters)
  }

  function handleFormChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      date: form.date ? new Date(form.date).toISOString() : undefined,
    }
    try {
      if (editingId) {
        await updateTransaction(editingId, payload)
      } else {
        await createTransaction(payload)
      }
      if (form.category && !categories.some((c) => c.name.toLowerCase() === form.category.toLowerCase())) {
        createCategory(form.category)
          .then((cat) => setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name))))
          .catch(() => {})
      }
      setForm(emptyForm)
      setEditingId(null)
      await loadData()
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
      date: t.date ? t.date.slice(0, 10) : '',
    })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this entry?')) return
    try {
      await deleteTransaction(id)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function fmt(amount) {
    const symbol = settings?.currency_symbol ?? '$'
    return `${symbol}${amount.toFixed(2)}`
  }

  // ---- Settings panel ----

  function openSettings() {
    setSettingsDraft({
      currency_code: settings.currency_code,
      currency_symbol: settings.currency_symbol,
      transaction_types: settings.transaction_types.map((t) => ({ ...t })),
    })
    setShowSettings(true)
  }

  function closeSettings() {
    setShowSettings(false)
    setSettingsDraft(null)
  }

  function updateDraftField(key, value) {
    setSettingsDraft((d) => ({ ...d, [key]: value }))
  }

  function updateDraftTypeDirection(name, direction) {
    setSettingsDraft((d) => ({
      ...d,
      transaction_types: d.transaction_types.map((t) =>
        t.name === name ? { ...t, direction } : t
      ),
    }))
  }

  function removeDraftType(name) {
    setSettingsDraft((d) => ({
      ...d,
      transaction_types: d.transaction_types.filter((t) => t.name !== name),
    }))
  }

  function addDraftType() {
    const name = newTypeName.trim().toLowerCase()
    if (!name) return
    if (settingsDraft.transaction_types.some((t) => t.name === name)) return
    setSettingsDraft((d) => ({
      ...d,
      transaction_types: [...d.transaction_types, { name, direction: newTypeDirection }],
    }))
    setNewTypeName('')
  }

  async function saveSettings() {
    try {
      const updated = await updateSettings(settingsDraft)
      setSettings(updated)
      closeSettings()
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function addCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    try {
      const cat = await createCategory(name)
      setCategories((prev) =>
        prev.some((c) => c.id === cat.id) ? prev : [...prev, cat].sort((a, b) => a.name.localeCompare(b.name))
      )
      setNewCategoryName('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeCategory(id) {
    try {
      await deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const typeOptions = settings?.transaction_types || []
  const rangeStart = total === 0 ? 0 : skip + 1
  const rangeEnd = Math.min(skip + PAGE_SIZE, total)

  return (
    <div className="page">
      <div className="container">
        <header className="masthead">
          <p className="eyebrow">Private ledger</p>
          <h1>The Ledger</h1>
          {settings && (
            <button type="button" className="settings-toggle" onClick={showSettings ? closeSettings : openSettings}>
              {showSettings ? 'Close settings' : 'Settings'}
            </button>
          )}
        </header>

        {error && <div className="error">{error}</div>}

        {showSettings && settingsDraft && (
          <section className="settings-panel">
            <p className="panel-title">Currency</p>
            <div className="form-grid">
              <label>
                <span>Code</span>
                <input
                  value={settingsDraft.currency_code}
                  onChange={(e) => updateDraftField('currency_code', e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </label>
              <label>
                <span>Symbol</span>
                <input
                  value={settingsDraft.currency_symbol}
                  onChange={(e) => updateDraftField('currency_symbol', e.target.value)}
                  maxLength={3}
                />
              </label>
            </div>

            <p className="panel-title">Transaction types</p>
            <ul className="type-list">
              {settingsDraft.transaction_types.map((t) => (
                <li key={t.name}>
                  <span className="type-name">{t.name}</span>
                  <select
                    value={t.direction}
                    onChange={(e) => updateDraftTypeDirection(t.name, e.target.value)}
                  >
                    <option value="in">Adds to balance</option>
                    <option value="out">Subtracts from balance</option>
                  </select>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => removeDraftType(t.name)}
                    disabled={settingsDraft.transaction_types.length <= 1}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="inline-add">
              <input
                placeholder="New type name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
              <select value={newTypeDirection} onChange={(e) => setNewTypeDirection(e.target.value)}>
                <option value="in">Adds to balance</option>
                <option value="out">Subtracts from balance</option>
              </select>
              <button type="button" className="btn-ghost" onClick={addDraftType}>
                Add type
              </button>
            </div>

            <p className="panel-title">Categories</p>
            <div className="chip-row">
              {categories.map((c) => (
                <span className="chip" key={c.id}>
                  {c.name}
                  <button type="button" onClick={() => removeCategory(c.id)} aria-label={`Remove ${c.name}`}>
                    ×
                  </button>
                </span>
              ))}
              {categories.length === 0 && <span className="muted">No categories yet.</span>}
            </div>
            <div className="inline-add">
              <input
                placeholder="New category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button type="button" className="btn-ghost" onClick={addCategory}>
                Add category
              </button>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-primary" onClick={saveSettings}>
                Save settings
              </button>
              <button type="button" className="btn-ghost" onClick={closeSettings}>
                Cancel
              </button>
            </div>
          </section>
        )}

        {summary && (
          <section className="balance-block">
            <p className="balance-label">Available balance</p>
            <p className="balance-figure">{fmt(summary.balance)}</p>
            <div className="stat-row">
              <div className="stat">
                <span>Income</span>
                <strong className="pos">{fmt(summary.total_income)}</strong>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span>Expense</span>
                <strong className="neg">{fmt(summary.total_expense)}</strong>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span>Entries</span>
                <strong>{summary.count}</strong>
              </div>
            </div>
          </section>
        )}

        <form className="entry-form" onSubmit={handleSubmit}>
          <p className="form-title">{editingId ? 'Amend entry' : 'New entry'}</p>
          <div className="form-grid">
            <label>
              <span>Title</span>
              <input name="title" value={form.title} onChange={handleFormChange} required />
            </label>
            <label>
              <span>Amount</span>
              <input
                name="amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={handleFormChange}
                required
              />
            </label>
            <label>
              <span>Type</span>
              <select name="type" value={form.type} onChange={handleFormChange} required>
                <option value="" disabled>
                  Select a type
                </option>
                {typeOptions.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Category</span>
              <input
                name="category"
                list="category-options"
                value={form.category}
                onChange={handleFormChange}
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </label>
            <label>
              <span>Date</span>
              <input name="date" type="date" value={form.date} onChange={handleFormChange} />
            </label>
            <label className="full">
              <span>Description</span>
              <input name="description" value={form.description} onChange={handleFormChange} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingId ? 'Save changes' : 'Add entry'}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="filters">
          <p className="panel-title">Filter entries</p>
          <div className="form-grid">
            <label className="full">
              <span>Search</span>
              <input
                placeholder="Title or description"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </label>
            <label>
              <span>Category</span>
              <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Type</span>
              <select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
                <option value="">All types</option>
                {typeOptions.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Min amount</span>
              <input
                type="number"
                step="0.01"
                value={filters.minAmount}
                onChange={(e) => updateFilter('minAmount', e.target.value)}
              />
            </label>
            <label>
              <span>Max amount</span>
              <input
                type="number"
                step="0.01"
                value={filters.maxAmount}
                onChange={(e) => updateFilter('maxAmount', e.target.value)}
              />
            </label>
            <label>
              <span>From date</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
              />
            </label>
            <label>
              <span>To date</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
              />
            </label>
            <label>
              <span>Sort by</span>
              <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        </section>

        <section className="ledger">
          <p className="ledger-title">Entries</p>
          {loading ? (
            <p className="muted">Loading entries…</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th className="num">Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => {
                    const isIn = directionByType[t.type] === 'in'
                    return (
                      <tr key={t.id}>
                        <td>
                          <span className="tx-title">{t.title}</span>
                          {t.description && <span className="tx-desc">{t.description}</span>}
                        </td>
                        <td className="muted">{t.category || '—'}</td>
                        <td className={`num ${isIn ? 'pos' : 'neg'}`}>
                          {isIn ? '+' : '−'}
                          {fmt(t.amount)}
                        </td>
                        <td className="row-actions">
                          <button onClick={() => handleEdit(t)}>Edit</button>
                          <button onClick={() => handleDelete(t.id)}>Delete</button>
                        </td>
                      </tr>
                    )
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty">
                        No entries match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="pagination">
                <span className="muted">
                  {total === 0 ? 'No entries' : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
                </span>
                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={skip === 0}
                    onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={skip + PAGE_SIZE >= total}
                    onClick={() => setSkip(skip + PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default App
