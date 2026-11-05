import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData, num, pct, int, unique } from '../data.js'
import { Card, DataTable, Kpi, Loading, PageHeader, Pill, Select, Source } from '../components.jsx'
import { C, axisProps } from '../theme.js'

export default function Bundles() {
  const state = useData(['m5_bundle_top20', 'm5_bundle_candidates', 'm5_build_log'])
  return (
    <>
      <PageHeader
        eyebrow="Module 5 · Market basket"
        title="Which products should we bundle?"
        question="Product pairs bought together more often than chance would predict, from 300,000 sampled Instacart orders. Lift above 1 means the pair appears together more than expected."
      />
      <Loading state={state}>{state.data && <Body d={state.data} />}</Loading>
    </>
  )
}

function Body({ d }) {
  const [top20, all, log] = d
  const [hint, setHint] = useState('')
  const [cat, setCat] = useState('')
  const cross = all.filter((r) => String(r.relationship_hint).startsWith('Different'))
  const same = all.length - cross.length
  const orders = log.find((r) => /orders sampled/i.test(r.step))?.value
  const top10 = top20.slice(0, 10).map((r) => ({ ...r, pair: `${r.antecedent} + ${r.consequent}` }))

  const catPair = (r) => `${r.m5_category_a} + ${r.m5_category_b}`
  const rows = all.filter((r) => (!hint || r.relationship_hint === hint) && (!cat || catPair(r) === cat))

  return (
    <>
      <div className="kpi-row">
        <Kpi label="Pairs with lift > 1.5" value={int(all.length)} note={orders ? `from ${int(orders)} sampled orders` : ''} tone="info" />
        <Kpi label="Cross-aisle pairs" value={int(cross.length)} note="possible complements: bundle candidates" tone="go" />
        <Kpi label="Same-aisle pairs" value={int(same)} note="possible substitutes: avoid bundling (P3)" tone="caution" />
        <Kpi label="Validated with prices" value="0" note="Instacart has no prices: every pair needs a test" tone="stop" />
      </div>

      <div className="grid-2">
        <Card title="Top 10 bundle candidates" subtitle="Cross-aisle pairs bought together by at least 150 different customers, ranked by customer-level lift.">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={top10} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid horizontal={false} stroke={C.grid} />
              <XAxis type="number" {...axisProps} />
              <YAxis type="category" dataKey="pair" width={250} {...axisProps} interval={0} tick={{ fill: C.muted, fontSize: 11 }} />
              <Tooltip formatter={(v, _n, p) => [`${num(v)} · ${int(p.payload.n_users_together)} customers`, 'Customer-level lift']} cursor={{ fill: C.greyLight, opacity: 0.4 }} />
              <Bar dataKey="user_lift" radius={[0, 4, 4, 0]}>
                {top10.map((_, i) => <Cell key={i} fill={C.blue} fillOpacity={1 - i * 0.06} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Source>m5_bundle_top20.csv</Source>
        </Card>

        <div className="stack">
          <Card title="Bought together does not mean promote together" className="callout">
            <p className="note">
              The highest-lift pairs overall are different flavours of the same yogurt or sparkling water: shoppers buying variety, not a bundle.
              Vindevogel et al. (2005) found that promotions built on such pairs often fail, because a discount on one item steals sales from the other.
            </p>
            <p className="note">
              That is why every pair is labelled <Pill tone="go">complement</Pill> or <Pill tone="caution">substitute</Pill> and marked
              <Pill tone="stop">Needs cross-price validation</Pill> before any bundle is launched.
            </p>
          </Card>
          <Card title="How the pairs were found">
            <table className="mini">
              <tbody>
                {log.map((r) => (
                  <tr key={r.step}><td>{r.step}</td><td className="right">{int(r.value)}</td></tr>
                ))}
              </tbody>
            </table>
            <Source>m5_build_log.csv</Source>
          </Card>
        </div>
      </div>

      <Card title="All bundle candidates">
        <DataTable
          rows={rows}
          searchKeys={['antecedent', 'consequent', 'antecedent_aisle', 'consequent_aisle']}
          placeholder="Search product or aisle, e.g. cilantro"
          initialSort={{ key: 'user_lift', dir: 'desc' }}
          filters={
            <>
              <Select label="Relationship" value={hint} onChange={setHint} options={unique(all, 'relationship_hint')} />
              <Select label="M5 categories" value={cat} onChange={setCat} options={[...new Set(all.map(catPair))].sort()} />
            </>
          }
          columns={[
            { key: 'antecedent', label: 'If customer buys' },
            { key: 'consequent', label: 'They also buy' },
            { key: 'consequent_aisle', label: 'Aisle' },
            { key: 'n_users_together', label: 'Customers', align: 'right', format: int },
            { key: 'support', label: 'Support', align: 'right', format: (v) => pct(v, 2) },
            { key: 'confidence', label: 'Confidence', align: 'right', format: (v) => pct(v) },
            { key: 'lift', label: 'Lift', align: 'right', format: (v) => num(v, 1) },
            { key: 'user_lift', label: 'Customer lift', align: 'right', format: (v) => num(v, 1) },
            { key: 'relationship_hint', label: 'Relationship', render: (r) => <Pill>{String(r.relationship_hint).startsWith('Same') ? 'Substitute' : 'Complement'}</Pill> },
            { key: 'validation_status', label: 'Status', render: (r) => <span className="nowrap muted">{String(r.validation_status).replace('Needs cross-price validation', 'Needs price test')}</span> },
          ]}
        />
        <Source>m5_bundle_candidates.csv · pair counting via sparse co-occurrence matrix, minimum support 0.1%, lift threshold 1.5.</Source>
      </Card>
    </>
  )
}
