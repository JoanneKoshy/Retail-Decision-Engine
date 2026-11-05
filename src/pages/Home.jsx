import { useData, int, num, pct, money, ruleRows } from '../data.js'
import { Loading, PageHeader, Pill } from '../components.jsx'
import { go } from '../App.jsx'
import { scenarioNames } from './Markdown.jsx'

const FILES = [
  'm1_build_log',
  'm2_elasticity_results',
  'm3_sensitivity',
  'm3_portfolio_by_depth',
  'm4_markdown_by_scenario_and_weeks_left',
  'm4_optimised_vs_fixed_rules',
  'm5_bundle_candidates',
]

export default function Home() {
  const state = useData(FILES)
  return (
    <>
      <PageHeader
        eyebrow="Decision engine"
        title="Four pricing decisions, backed by data"
        question="Each card answers one of the CEO brief's questions. Open a card for the evidence, the item-level recommendations and the assumptions behind them."
      />
      <Loading state={state}>{state.data && <Cards data={state.data} />}</Loading>
    </>
  )
}

function Cards({ data }) {
  const [build, elas, sens, depth, mdScen, mdRules, bundles] = data

  // Module 2: one row per item (results file repeats the item's estimate for each store)
  const items = Object.values(Object.fromEntries(elas.map((r) => [r.item_id, r])))
  const byType = (t) => items.filter((r) => r.demand_type === t).length

  // Module 3
  const rois = sens.map((r) => r.portfolio_ROI)
  const shareProfitable = Math.max(...sens.map((r) => r.share_profitable))
  const shallow = depth[0]

  // Module 4
  const { base, elastic } = scenarioNames(mdScen)
  const baseRow = mdScen.find((r) => r.scenario === base && r.weeks_left === 4)
  const { opt, fixed } = ruleRows(mdRules, elastic)

  // Module 5
  const cross = bundles.filter((r) => String(r.relationship_hint).startsWith('Different')).length

  const b = build[0] || {}

  return (
    <>
      <div className="decision-grid">
        <DecisionCard
          page="price"
          module="Module 2 · Price elasticity"
          question="Should we change the regular price?"
          value={`${byType('Price-sensitive')} of ${items.length}`}
          valueNote="top-selling items are price-sensitive"
          verdict={`${byType('Less sensitive')} items can hold or raise price; ${byType('Unclear')} need review before any change.`}
          tag="Test discounts on sensitive items"
          tone="go"
        />
        <DecisionCard
          page="promotion"
          module="Module 3 · Promotion uplift"
          question="Should we run a promotion?"
          value={`${num(Math.max(...rois))} to ${num(Math.min(...rois))}`}
          valueNote="portfolio ROI on discount spend"
          verdict={`At most ${pct(shareProfitable)} of short promotions pay back. Even the shallowest band (${shallow?.discount_depth}) returns ${num(shallow?.portfolio_ROI)}.`}
          tag="Reduce or stop most promotions"
          tone="stop"
        />
        <DecisionCard
          page="markdown"
          module="Module 4 · Markdown optimisation"
          question="Should we mark down slow stock?"
          value={baseRow ? pct(baseRow.avg_markdown) : '—'}
          valueNote="best average markdown at the dataset's own elasticity"
          verdict={
            opt && fixed
              ? `If demand were elastic, per-SKU markdowns would beat a fixed rule by ${money(opt.vs_no_markdown - fixed.vs_no_markdown)}.`
              : 'Markdowns pay only when demand is price-elastic.'
          }
          tag="Hold price unless demand is elastic"
          tone="caution"
        />
        <DecisionCard
          page="bundles"
          module="Module 5 · Market basket"
          question="Which products should we bundle?"
          value={int(cross)}
          valueNote={`cross-aisle pairs (of ${int(bundles.length)} with lift > 1.5)`}
          verdict="The strongest pairs are flavours of the same product (substitutes). Cooking sets such as cilantro, jalapeño and limes are the real bundle candidates."
          tag="Every pair needs a price test"
          tone="info"
        />
      </div>

      <div className="foundation">
        <div>
          <div className="eyebrow">Module 1 · Data foundation</div>
          <strong>{int(b.rows_kept)}</strong> item-store-days of Walmart sales, prices and calendar, after dropping{' '}
          <strong>{int(b.rows_dropped_no_price)}</strong> days with no price and flagging <strong>{int(b.rows_price_anomaly)}</strong> price errors.
        </div>
        <a href="#/assumptions" className="link">See all assumptions →</a>
      </div>
    </>
  )
}

function DecisionCard({ page, module, question, value, valueNote, verdict, tag, tone }) {
  return (
    <button className={`decision tone-${tone}`} onClick={() => go(page)}>
      <div className="decision-bar" />
      <div className="decision-module">{module}</div>
      <h2>{question}</h2>
      <div className="decision-value">{value}</div>
      <div className="decision-note">{valueNote}</div>
      <p className="decision-verdict">{verdict}</p>
      <div className="decision-foot">
        <Pill tone={tone}>{tag}</Pill>
        <span className="open">Open →</span>
      </div>
    </button>
  )
}
