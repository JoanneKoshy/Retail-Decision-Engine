// Loads the JSON files written by src/export_for_dashboard.py into dashboard/public/data.
import { useEffect, useState } from 'react'

const cache = {}

function load(name) {
  if (!cache[name]) {
    cache[name] = fetch(`${import.meta.env.BASE_URL}data/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`${name}.json not found (${r.status})`)
      return r.json()
    })
  }
  return cache[name]
}

// useData('m2_elasticity_results') or useData(['a', 'b']) -> { data, error, loading }
export function useData(names) {
  const list = Array.isArray(names) ? names : [names]
  const key = list.join('|')
  const [state, setState] = useState({ data: null, error: null, loading: true })

  useEffect(() => {
    let alive = true
    Promise.all(list.map(load))
      .then((res) => alive && setState({ data: Array.isArray(names) ? res : res[0], error: null, loading: false }))
      .catch((e) => alive && setState({ data: null, error: e.message, loading: false }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}

// ---------- formatting ----------
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export const num = (v, d = 2) => (isNum(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—')
export const int = (v) => (isNum(v) ? Math.round(v).toLocaleString('en-US') : '—')
// fraction (0.25) -> "25%"; values already above 1 are treated as percentages
export const pct = (v, d = 0) => (isNum(v) ? `${(Math.abs(v) <= 1 ? v * 100 : v).toFixed(d)}%` : '—')
export const money = (v) => {
  if (!isNum(v)) return '—'
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)} M`
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)} K`
  return `${s}$${a.toFixed(0)}`
}
export const signed = (v, d = 2) => (isNum(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d) : '—')

// ---------- status colours (no green, per the brief) ----------
// tone: go = blue, caution = amber, stop = coral, neutral = grey, info = purple
export function toneOf(text) {
  const t = String(text ?? '').toLowerCase()
  if (/unclear|review|failed/.test(t)) return 'neutral'
  if (/^stop|stop promotion/.test(t)) return 'stop'
  if (/hold|salvage|sells through|not profitable/.test(t)) return 'info'
  if (/reduce|less sensitive|protect|substitut|few repeat/.test(t)) return 'caution'
  if (/continue|price-sensitive|test a discount|mark ?down|complement|broad/.test(t)) return 'go'
  return 'neutral'
}

// Rows of m4_optimised_vs_fixed_rules for one scenario
export function ruleRows(rules, scenario) {
  const r = rules.filter((x) => x.scenario === scenario)
  return {
    opt: r.find((x) => /optimi[sz]ed|per.?sku/i.test(x.rule) && !/dataset/i.test(x.rule)),
    fixed: r.find((x) => /fixed/i.test(x.rule) && !/dataset/i.test(x.rule)),
  }
}

export const unique = (rows, key) => [...new Set(rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined))].sort()
