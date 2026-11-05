import { useMemo, useState } from 'react'
import { toneOf } from './data.js'

export function PageHeader({ eyebrow, title, question, children }) {
  return (
    <header className="page-header">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {question && <p className="question">{question}</p>}
      {children}
    </header>
  )
}

export function Card({ title, subtitle, children, className = '', action }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ label, value, note, tone = 'neutral' }) {
  return (
    <div className={`kpi tone-${tone}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {note && <div className="kpi-note">{note}</div>}
    </div>
  )
}

export function Pill({ children, tone }) {
  return <span className={`pill tone-${tone || toneOf(children)}`}>{children ?? '—'}</span>
}

export function Loading({ state, children }) {
  if (state.loading) return <div className="state">Loading data…</div>
  if (state.error)
    return (
      <div className="state error">
        Could not load data: {state.error}. Run <code>python src/export_for_dashboard.py</code> from the project folder.
      </div>
    )
  return children
}

export function Select({ label, value, onChange, options, allLabel = 'All' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

/**
 * columns: [{ key, label, format?(value,row), render?(row), align? }]
 * searchKeys: keys searched by the text box
 */
export function DataTable({ rows, columns, searchKeys = [], pageSize = 12, initialSort, placeholder = 'Search…', filters }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(initialSort || null)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    let r = rows
    if (q && searchKeys.length) {
      const s = q.toLowerCase()
      r = r.filter((row) => searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(s)))
    }
    if (sort) {
      const { key, dir } = sort
      r = [...r].sort((a, b) => {
        const x = a[key], y = b[key]
        if (x === y) return 0
        if (x === null || x === undefined) return 1
        if (y === null || y === undefined) return -1
        return (x > y ? 1 : -1) * (dir === 'asc' ? 1 : -1)
      })
    }
    return r
  }, [rows, q, sort, searchKeys])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const p = Math.min(page, pages - 1)
  const shown = filtered.slice(p * pageSize, p * pageSize + pageSize)

  const toggle = (key) => {
    setSort((s) => (s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
    setPage(0)
  }

  return (
    <div className="table-wrap">
      <div className="table-tools">
        {searchKeys.length > 0 && (
          <input className="search" value={q} placeholder={placeholder} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
        )}
        {filters}
        <span className="count">{filtered.length.toLocaleString('en-US')} rows</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.align === 'right' ? 'right' : ''} onClick={() => toggle(c.key)}>
                  {c.label}
                  {sort && sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'right' : ''}>
                    {c.render ? c.render(row) : c.format ? c.format(row[c.key], row) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="empty">No rows match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pager">
          <button disabled={p === 0} onClick={() => setPage(p - 1)}>‹ Prev</button>
          <span>Page {p + 1} of {pages}</span>
          <button disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Next ›</button>
        </div>
      )}
    </div>
  )
}

export function Source({ children }) {
  return <p className="source">Source: {children}</p>
}
