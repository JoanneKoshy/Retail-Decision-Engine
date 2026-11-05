import { Card, PageHeader } from '../components.jsx'

// Keep this list in step with assumptions.md in the project root.
const ROWS = [
  ['1', 'Regular price', 'Highest price in the previous 8 weeks', 'CEO brief'],
  ['1', 'Promotion flag', 'Price at least 10% below regular price', 'CEO brief'],
  ['1', 'No promotion flag in an item’s first weeks on sale', 'First 4 weeks', 'Not enough price history for the 8-week regular price'],
  ['1', 'Price error threshold', 'Discounts above 75% marked price_anomaly', 'Prices of $0.01 on items normally $3 to $9'],
  ['2', 'Price variation needed for selection', '≥3 distinct prices, ≥5% range', 'Elasticity cannot be estimated without price movement'],
  ['2', 'Data level and pooling', 'Weekly, pooled per item across stores', 'Daily single-store data was too noisy'],
  ['2', 'Controls', 'Store × year, month, SNAP days, event days; promotion not a control', 'The promo flag is derived from price'],
  ['2', 'Stock-outs', 'Weeks with any zero-sales day excluded', 'Empty shelves biased elasticities upward'],
  ['2', 'Classification', 'Only when DoubleML and fixed-effects OLS agree in sign', 'Guards against model-specific artefacts'],
  ['3', 'Gross margins', 'Foods 25%, Household 35%, Hobbies 40%', 'CEO brief; no real cost data'],
  ['3', 'Promotion definition', 'Windows of up to 2 weeks', 'Longer windows are mostly permanent price cuts'],
  ['3', 'Valid baseline', '≥14 non-promotion days in the 4 weeks before', 'Reliable comparison'],
  ['3', 'Stock-out risk', 'Any zero-sales day during promotion, baseline ≥2 units a day', 'Same lesson as Module 2'],
  ['3', 'Inflated regular price', 'Regular price more than 15% above baseline average price', 'One-week price spikes'],
  ['3', 'Reliable SKU-store result', 'Baseline predicts ≥100 units across its promotions', 'Slow movers are too noisy individually'],
  ['4', 'Season and sales period', 'Historical sales cover a 12-week season', 'No time axis in the data'],
  ['4', 'Unit cost', '50% of original price', 'No cost data; typical beauty gross margin'],
  ['4', 'Salvage value', '20% of unit cost', 'Brief requires a documented salvage value'],
  ['4', 'Base case and alternative', '4 weeks left; alternative elasticity −2.0', 'Show how markdowns behave under elastic demand'],
  ['5', 'Sample and support', '300,000 orders; minimum support 0.1%; pairs only', 'Memory and speed'],
  ['5', 'Bundle shortlist', 'Lift above 1.5', 'CEO brief'],
  ['5', 'Broad-based pair', 'Bought together by ≥150 different customers', 'Excludes pairs driven by a few repeat shoppers'],
  ['5', 'Substitute vs complement', 'Same aisle = possible substitutes; different aisle = possible complements', 'Vindevogel et al. (2005)'],
  ['5', 'Instacart → M5 category', 'Household, personal care, babies, pets → HOUSEHOLD; food departments → FOODS', 'For a later validation test on M5'],
]

export default function Assumptions() {
  return (
    <>
      <PageHeader
        eyebrow="Ground rules"
        title="Assumptions"
        question="Every judgement call behind the numbers. Changing any of these changes the results, so each is recorded here and in assumptions.md."
      />
      <Card>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Module</th><th>Assumption</th><th>Value</th><th>Reason</th></tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i}>
                  <td><span className="module-chip">M{r[0]}</span></td>
                  <td><strong>{r[1]}</strong></td>
                  <td>{r[2]}</td>
                  <td className="muted">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
