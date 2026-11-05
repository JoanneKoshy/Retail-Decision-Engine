import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData, num, pct, int, unique, toneOf } from '../data.js'
import { Card, DataTable, Kpi, Loading, PageHeader, Pill, Select, Source } from '../components.jsx'
import { C, axisProps, toneColor } from '../theme.js'

const FAILED = 50 // |elasticity| above this = numerical failure in the model

export default function Price() {
  const state = useData(['m2_elasticity_results', 'm2_naive_vs_dml_summary'])
  return (
    <>
      <PageHeader
        eyebrow="Module 2 · Price elasticity (DoubleML)"
        title="Should we change the regular price?"
        question="How much demand changes when price changes, after controlling for store, year, month, SNAP and events. Estimated for the 54 items behind the top 150 item-stores by volume."
      />
      <Loading state={state}>{state.data && <Body elas={state.data[0]} summary={state.data[1]} />}</Loading>
    </>
  )
}

function Body({ elas, summary }) {
  const [type, setType] = useState('')
  const items = useMemo(() => {
    const m = {}
    for (const r of elas) {
      if (!m[r.item_id]) m[r.item_id] = { ...r, stores: [] }
      m[r.item_id].stores.push(r.store_id)
    }
    return Object.values(m).map((r) => ({ ...r, failed: Math.abs(r.elasticity) > FAILED, n_stores: r.stores.length }))
  }, [elas])

  const count = (t) => items.filter((r) => r.demand_type === t).length
  const chart = items.filter((r) => !r.failed && r.demand_type !== 'Unclear').sort((a, b) => a.elasticity - b.elasticity)
  const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
  const ok = items.filter((r) => !r.failed)

  return (
    <>
      <div className="kpi-row">
        <Kpi label="Price-sensitive" value={count('Price-sensitive')} note="elasticity below −1 → test a discount" tone="go" />
        <Kpi label="Less sensitive" value={count('Less sensitive')} note="between −1 and 0 → protect price" tone="caution" />
        <Kpi label="Unclear" value={count('Unclear')} note="not significant, positive or methods disagree" tone="neutral" />
        <Kpi label="Median elasticity" value={num(median(ok.map((r) => r.elasticity)))} note={`across ${ok.length} items with a valid estimate`} tone="info" />
      </div>

      <div className="grid-2">
        <Card title="Elasticity of every classified item" subtitle="Bars below −1 (dashed line) mean a 1% price cut lifts volume by more than 1%. Unclear items are left out.">
          <ResponsiveContainer width="100%" height={Math.max(260, chart.length * 22 + 40)}>
            <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid horizontal={false} stroke={C.grid} />
              <XAxis type="number" {...axisProps} domain={[(m) => Math.floor(m), 0]} allowDecimals={false} />
              <YAxis type="category" dataKey="item_id" width={130} {...axisProps} interval={0} />
              <Tooltip
                formatter={(v, _n, p) => [`${num(v)}  (CI ${p.payload.conf_interval})`, 'Elasticity']}
                cursor={{ fill: C.greyLight, opacity: 0.4 }}
              />
              <ReferenceLine x={-1} stroke={C.text} strokeDasharray="4 4" label={{ value: '−1', position: 'top', fill: C.muted, fontSize: 12 }} />
              <Bar dataKey="elasticity" radius={[4, 0, 0, 4]}>
                {chart.map((r) => (
                  <Cell key={r.item_id} fill={toneColor[toneOf(r.demand_type)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Source>m2_elasticity_results.csv</Source>
        </Card>

        <div className="stack">
          <Card title="Why DoubleML instead of a simple regression">
            <table className="mini">
              <thead><tr><th>Model</th><th className="right">Median</th><th className="right">Share positive</th></tr></thead>
              <tbody>
                {summary.map((r, i) => (
                  <tr key={i}>
                    <td>{r['Unnamed: 0'] ?? r.model}</td>
                    <td className="right">{num(r.median)}</td>
                    <td className="right">{pct(r.share_positive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">
              A positive elasticity (higher price, higher sales) is almost always a data problem. The biggest fix was not the estimator but the data:
              weekly data, pooling across stores and removing stock-out weeks halved the false positives.
            </p>
            <Source>m2_naive_vs_dml_summary.csv</Source>
          </Card>
          <Card title="Read this before acting" className="callout">
            <p className="note">
              Estimates compare weeks within the same store and year, so they come mainly from temporary price drops. They answer
              “will a discount lift sales?” better than “should the regular price change?”. A controlled price test is the reliable way to settle a regular-price change.
            </p>
          </Card>
        </div>
      </div>

      <Card title="Item recommendations" subtitle="One row per item; the estimate is pooled across the stores listed.">
        <DataTable
          rows={type ? items.filter((r) => r.demand_type === type) : items}
          searchKeys={['item_id', 'cat_id']}
          placeholder="Search item, e.g. FOODS_3_090"
          initialSort={{ key: 'elasticity', dir: 'asc' }}
          filters={<Select label="Demand type" value={type} onChange={setType} options={unique(items, 'demand_type')} />}
          columns={[
            { key: 'item_id', label: 'Item' },
            { key: 'cat_id', label: 'Category' },
            { key: 'elasticity', label: 'Elasticity', align: 'right', format: (v, r) => (r.failed ? 'model failed' : num(v)) },
            { key: 'conf_interval', label: '95% CI', render: (r) => <span className="nowrap">{r.failed ? '—' : r.conf_interval}</span> },
            { key: 'demand_type', label: 'Demand type', render: (r) => <Pill>{r.demand_type}</Pill> },
            { key: 'pricing_recommendation', label: 'Recommendation' },
            { key: 'share_weeks_kept', label: 'In-stock weeks', align: 'right', format: (v) => pct(v) },
            { key: 'n_stores', label: 'Stores', align: 'right', format: int },
            { key: 'review_reason', label: 'Review reason', format: (v) => v || '—' },
          ]}
        />
        <Source>m2_elasticity_results.csv · DoubleML PLR, boosted trees, 5-fold cross-fitting; an item is classified only when DoubleML and fixed-effects OLS agree in sign.</Source>
      </Card>
    </>
  )
}
