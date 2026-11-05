import { useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData, num, pct, int, money, unique, ruleRows } from '../data.js'
import { Card, DataTable, Kpi, Loading, PageHeader, Pill, Select, Source } from '../components.jsx'
import { C, axisProps } from '../theme.js'

const LEVELS = ['0%', '10%', '20%', '30%', '40%', '50%']
const WEEK_SHADES = { 8: 0.35, 4: 0.65, 2: 1 }

// The scenario with the smaller average markdown is the dataset's own (inelastic) elasticity.
export function scenarioNames(rows) {
  const names = unique(rows, 'scenario')
  const avg = (s) => {
    const r = rows.filter((x) => x.scenario === s)
    return r.reduce((a, x) => a + (x.avg_markdown || 0), 0) / Math.max(1, r.length)
  }
  const sorted = [...names].sort((a, b) => avg(a) - avg(b))
  return { base: sorted[0], elastic: sorted[sorted.length - 1], names }
}

export default function Markdown() {
  const state = useData(['m4_markdown_by_scenario_and_weeks_left', 'm4_optimised_vs_fixed_rules', 'm4_markdown_recommendations'])
  return (
    <>
      <PageHeader
        eyebrow="Module 4 · Markdown optimisation"
        title="Should we mark down slow-moving stock?"
        question="For each SKU, simulate markdowns of 0–50% and pick the one with the highest expected profit, counting the salvage value of leftover stock. Retail Markdown dataset (synthetic, 43,400 beauty SKUs)."
      />
      <Loading state={state}>{state.data && <Body d={state.data} />}</Loading>
    </>
  )
}

function Body({ d }) {
  const [scen, rules, recs] = d
  const { base, elastic, names } = scenarioNames(scen)
  const [chosen, setChosen] = useState(elastic)

  const curves = LEVELS.map((lvl) => {
    const row = { markdown: lvl }
    for (const r of scen.filter((x) => x.scenario === chosen)) row[`${r.weeks_left} weeks left`] = r[lvl]
    return row
  })
  const weeks = scen.filter((x) => x.scenario === chosen).map((r) => r.weeks_left).sort((a, b) => b - a)

  const baseRow = scen.find((r) => r.scenario === base && r.weeks_left === 4)
  const el4 = scen.find((r) => r.scenario === elastic && r.weeks_left === 4)
  const { opt, fixed } = ruleRows(rules, elastic)

  return (
    <>
      <div className="kpi-row">
        <Kpi label="Best markdown, dataset elasticity" value={baseRow ? pct(baseRow.avg_markdown) : '—'} note="demand barely responds (−0.33), so markdowns lose money" tone="caution" />
        <Kpi label="Best markdown, elastic demand" value={el4 ? pct(el4.avg_markdown) : '—'} note={el4 ? `${pct(el4.share_marked_down)} of SKUs marked down, 4 weeks left` : ''} tone="go" />
        <Kpi label="Optimised vs fixed 30% rule" value={opt && fixed ? money(opt.vs_no_markdown - fixed.vs_no_markdown) : '—'} note="extra profit under elastic demand" tone="info" />
        <Kpi label="SKUs scored" value={int(recs.length)} note="base case: 4 weeks left" tone="neutral" />
      </div>

      <div className="grid-2">
        <Card
          title="Total profit at each markdown level"
          subtitle="All SKUs combined. The peak of each line is the best single markdown; it moves right as the season runs out."
          action={
            <div className="seg small">
              {names.map((n) => (
                <button key={n} className={chosen === n ? 'on' : ''} onClick={() => setChosen(n)}>
                  {n === base ? 'Dataset elasticity' : n === elastic ? 'Elastic demand' : n}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={curves} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="markdown" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={money} width={70} />
              <Tooltip formatter={(v) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {weeks.map((w) => (
                <Line key={w} type="monotone" dataKey={`${w} weeks left`} stroke={C.blue} strokeOpacity={WEEK_SHADES[w] ?? 0.7} strokeWidth={2.5} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <Source>m4_markdown_by_scenario_and_weeks_left.csv</Source>
        </Card>

        <Card title="Optimised markdowns vs fixed rules" subtitle="Change in total profit compared with no markdown, 4 weeks left.">
          <table className="mini">
            <thead><tr><th>Scenario</th><th>Rule</th><th className="right">vs no markdown</th></tr></thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={i}>
                  <td>{r.scenario === base ? 'Dataset elasticity' : r.scenario === elastic ? 'Elastic demand' : r.scenario}</td>
                  <td>{r.rule}</td>
                  <td className={`right ${r.vs_no_markdown < 0 ? 'neg' : ''}`}>{money(r.vs_no_markdown)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">
            Like Zara's clearance system (Caro &amp; Gallien, 2012), a demand estimate feeding an optimiser beats a blanket markdown, but only when
            customers respond to price. The dataset's own “Optimal Discount” column is not an optimisation: it averages the four markdown levels.
          </p>
          <Source>m4_optimised_vs_fixed_rules.csv</Source>
        </Card>
      </div>

      <RecTable rows={recs} />
    </>
  )
}

function RecTable({ rows }) {
  const [cat, setCat] = useState('')
  const [action, setAction] = useState('')
  const f = useMemo(() => rows.filter((r) => (!cat || r.category === cat) && (!action || r.action === action)), [rows, cat, action])
  return (
    <Card title="Recommendation for every SKU" subtitle="Base case: dataset elasticity, 4 weeks left in a 12-week season, unit cost 50% of price, salvage 20% of cost.">
      <DataTable
        rows={f}
        searchKeys={['SKU']}
        placeholder="Search SKU number"
        initialSort={{ key: 'leftover_inventory', dir: 'desc' }}
        filters={
          <>
            <Select label="Category" value={cat} onChange={setCat} options={unique(rows, 'category')} />
            <Select label="Action" value={action} onChange={setAction} options={unique(rows, 'action')} />
          </>
        }
        columns={[
          { key: 'SKU', label: 'SKU' },
          { key: 'category', label: 'Category' },
          { key: 'current_stock', label: 'Stock', align: 'right', format: int },
          { key: 'weeks_cover', label: 'Weeks cover', align: 'right', format: (v) => num(v, 1) },
          { key: 'recommended_markdown', label: 'Markdown', align: 'right', format: (v) => pct(v) },
          { key: 'expected_sales', label: 'Exp. sales', align: 'right', format: (v) => num(v, 0) },
          { key: 'expected_margin', label: 'Exp. margin', align: 'right', format: money },
          { key: 'leftover_inventory', label: 'Leftover', align: 'right', format: (v) => num(v, 0) },
          { key: 'action', label: 'Action', render: (r) => <Pill>{r.action}</Pill> },
        ]}
      />
      <Source>m4_markdown_recommendations.csv</Source>
    </Card>
  )
}
