import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData, num, pct, int, money, unique } from '../data.js'
import { Card, DataTable, Kpi, Loading, PageHeader, Pill, Select, Source } from '../components.jsx'
import { C, axisProps } from '../theme.js'

const FILES = [
  'm3_portfolio_by_depth',
  'm3_portfolio_by_category',
  'm3_portfolio_by_store',
  'm3_sensitivity',
  'm3_promotion_uplift_results',
  'm3_hand_worked_examples',
]

// Margin assumptions from the CEO brief
const MARGINS = { FOODS: 0.25, HOUSEHOLD: 0.35, HOBBIES: 0.4 }

export default function Promotion() {
  const state = useData(FILES)
  return (
    <>
      <PageHeader
        eyebrow="Module 3 · Promotion uplift"
        title="Should we run a promotion?"
        question="Did promotions create sales that would not have happened anyway, and did the extra margin cover the discount given away? Short promotions (up to 2 weeks) on Walmart M5, 2011–2016."
      />
      <Loading state={state}>{state.data && <Body d={state.data} />}</Loading>
    </>
  )
}

function Body({ d }) {
  const [depth, cat, store, sens, results, examples] = d
  const rois = sens.map((r) => r.portfolio_ROI)
  const windows = depth.reduce((s, r) => s + (r.windows || 0), 0)

  return (
    <>
      <div className="kpi-row">
        <Kpi label="Portfolio ROI" value={`${num(Math.max(...rois))} to ${num(Math.min(...rois))}`} note={`across ${sens.length} sensitivity settings`} tone="stop" />
        <Kpi label="Profitable promotions" value={`≤ ${pct(Math.max(...sens.map((r) => r.share_profitable)))}`} note="in every setting tested" tone="stop" />
        <Kpi label="Short promotions analysed" value={int(windows)} note="up to 2 weeks, stock-out windows removed" tone="neutral" />
        <Kpi label="SKU-stores scored" value={int(results.length)} note="each with Continue / Reduce / Stop" tone="info" />
      </div>

      <div className="grid-2">
        <Card title="Every discount depth loses money, and deeper discounts lose more" subtitle="Portfolio ROI = incremental margin ÷ discount cost. −1 means the whole discount was lost.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={depth} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="discount_depth" {...axisProps} />
              <YAxis {...axisProps} domain={[-1, 0]} />
              <ReferenceLine y={0} stroke={C.text} />
              <Tooltip formatter={(v, n, p) => [`${num(v)} across ${int(p.payload.windows)} promotions`, 'Portfolio ROI']} cursor={{ fill: C.greyLight, opacity: 0.4 }} />
              <Bar dataKey="portfolio_ROI" radius={[0, 0, 4, 4]}>
                {depth.map((r, i) => (
                  <Cell key={i} fill={C.coral} fillOpacity={0.45 + (0.55 * i) / Math.max(1, depth.length - 1)} />
                ))}
                <LabelList dataKey="portfolio_ROI" position="insideBottom" offset={8} formatter={(v) => num(v)} fill={C.text} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Source>m3_portfolio_by_depth.csv</Source>
        </Card>
        <BreakEven />
      </div>

      <div className="grid-2">
        <Card title="By category">
          <SummaryTable rows={cat} keyCol="cat_id" label="Category" />
          <Source>m3_portfolio_by_category.csv</Source>
        </Card>
        <Card title="By store">
          <SummaryTable rows={store} keyCol="store_id" label="Store" />
          <Source>m3_portfolio_by_store.csv</Source>
        </Card>
      </div>

      <ResultsTable rows={results} />

      <Card title="Three promotions worked through by hand" subtitle="Used to validate the calculation, as the brief requires.">
        <DataTable
          rows={examples}
          pageSize={5}
          columns={[
            { key: 'item_id', label: 'Item' },
            { key: 'store_id', label: 'Store' },
            { key: 'promo_start', label: 'Start' },
            { key: 'promo_days', label: 'Days', align: 'right' },
            { key: 'regular_price', label: 'Regular $', align: 'right', format: (v) => num(v) },
            { key: 'promo_price', label: 'Promo $', align: 'right', format: (v) => num(v) },
            { key: 'baseline_sales', label: 'Baseline/day', align: 'right', format: (v) => num(v) },
            { key: 'promo_sales', label: 'Promo/day', align: 'right', format: (v) => num(v) },
            { key: 'incremental_margin', label: 'Incr. margin', align: 'right', format: (v) => money(v) },
            { key: 'discount_cost', label: 'Discount cost', align: 'right', format: (v) => money(v) },
            { key: 'promotion_ROI', label: 'ROI', align: 'right', format: (v) => num(v) },
            { key: 'recommendation', label: 'Action', render: (r) => <Pill>{r.recommendation}</Pill> },
          ]}
        />
        <Source>m3_hand_worked_examples.csv</Source>
      </Card>

      <Card title="Sensitivity: the answer does not depend on the filters">
        <DataTable
          rows={sens}
          pageSize={10}
          columns={[
            { key: 'min_baseline_per_day', label: 'Min. baseline units/day', align: 'right' },
            { key: 'stockout_windows_removed', label: 'Stock-out windows removed', format: (v) => String(v) },
            { key: 'windows', label: 'Promotions', align: 'right', format: int },
            { key: 'volume_weighted_lift', label: 'Lift', align: 'right', format: (v) => pct(v) },
            { key: 'portfolio_ROI', label: 'Portfolio ROI', align: 'right', format: (v) => num(v) },
            { key: 'share_profitable', label: 'Profitable', align: 'right', format: (v) => pct(v) },
            { key: 'total_incr_margin', label: 'Total incr. margin', align: 'right', format: money },
          ]}
        />
        <Source>m3_sensitivity.csv</Source>
      </Card>
    </>
  )
}

function SummaryTable({ rows, keyCol, label }) {
  return (
    <table className="mini">
      <thead>
        <tr><th>{label}</th><th className="right">Promotions</th><th className="right">Lift</th><th className="right">ROI</th><th className="right">Profitable</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[keyCol]}>
            <td>{r[keyCol]}</td>
            <td className="right">{int(r.windows)}</td>
            <td className="right">{pct(r.volume_weighted_lift)}</td>
            <td className="right">{num(r.portfolio_ROI)}</td>
            <td className="right">{pct(r.share_profitable)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BreakEven() {
  const [cat, setCat] = useState('FOODS')
  const [margin, setMargin] = useState(25)
  const [discount, setDiscount] = useState(15)
  const m = margin / 100, dd = discount / 100
  const never = dd >= m
  const multiple = never ? null : m / (m - dd)

  const pick = (c) => { setCat(c); setMargin(MARGINS[c] * 100) }

  return (
    <Card title="Break-even calculator" subtitle="How much must sales rise for a promotion just to pay for itself?" className="calc">
      <div className="seg">
        {Object.keys(MARGINS).map((c) => (
          <button key={c} className={cat === c ? 'on' : ''} onClick={() => pick(c)}>{c}</button>
        ))}
      </div>
      <label className="slider">
        <span>Gross margin <strong>{margin}%</strong></span>
        <input type="range" min="5" max="60" value={margin} onChange={(e) => { setMargin(+e.target.value); setCat('') }} />
      </label>
      <label className="slider">
        <span>Discount <strong>{discount}%</strong></span>
        <input type="range" min="5" max="50" value={discount} onChange={(e) => setDiscount(+e.target.value)} />
      </label>
      <div className={`calc-result ${never ? 'tone-stop' : multiple > 2 ? 'tone-caution' : 'tone-go'}`}>
        {never ? (
          <>
            <div className="calc-big">Never</div>
            <div>A {discount}% discount on a {margin}% margin sells at or below cost, so no lift can pay for it.</div>
          </>
        ) : (
          <>
            <div className="calc-big">×{multiple.toFixed(2)}</div>
            <div>Sales during the promotion must be <strong>{((multiple - 1) * 100).toFixed(0)}% above normal</strong> just to break even.</div>
          </>
        )}
      </div>
      <p className="note">Formula: promotion sales ÷ baseline sales must exceed margin ÷ (margin − discount). Typical measured lifts were 30–50%.</p>
    </Card>
  )
}

function ResultsTable({ rows }) {
  const [rec, setRec] = useState('')
  const [rel, setRel] = useState('')
  const [cat, setCat] = useState('')
  const f = rows.filter((r) => (!rec || r.recommendation === rec) && (!rel || r.reliability === rel) && (!cat || r.cat_id === cat))
  return (
    <Card title="Recommendation for every promoted SKU-store" subtitle="Reliability says whether the SKU-store has enough volume to judge on its own; for slow movers, rely on the portfolio results above.">
      <DataTable
        rows={f}
        searchKeys={['item_id', 'store_id']}
        placeholder="Search item or store"
        initialSort={{ key: 'expected_units', dir: 'desc' }}
        filters={
          <>
            <Select label="Action" value={rec} onChange={setRec} options={unique(rows, 'recommendation')} />
            <Select label="Reliability" value={rel} onChange={setRel} options={unique(rows, 'reliability')} />
            <Select label="Category" value={cat} onChange={setCat} options={unique(rows, 'cat_id')} />
          </>
        }
        columns={[
          { key: 'item_id', label: 'Item' },
          { key: 'store_id', label: 'Store' },
          { key: 'n_promotions', label: 'Promos', align: 'right', format: int },
          { key: 'avg_discount', label: 'Avg discount', align: 'right', format: (v) => pct(v) },
          { key: 'baseline_sales', label: 'Baseline/day', align: 'right', format: (v) => num(v) },
          { key: 'promo_sales', label: 'Promo/day', align: 'right', format: (v) => num(v) },
          { key: 'incremental_units', label: 'Incr. units', align: 'right', format: (v) => num(v, 1) },
          { key: 'incremental_margin', label: 'Incr. margin', align: 'right', format: money },
          { key: 'promotion_ROI', label: 'ROI', align: 'right', format: (v) => num(v) },
          { key: 'recommendation', label: 'Action', render: (r) => <Pill>{r.recommendation}</Pill> },
          { key: 'reliability', label: 'Reliability' },
        ]}
      />
      <Source>m3_promotion_uplift_results.csv · margins assumed: Foods 25%, Household 35%, Hobbies 40%.</Source>
    </Card>
  )
}
