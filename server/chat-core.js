// Chat backend: answers questions from the project's own result files using Azure OpenAI tool calls.
// The API key is read from environment variables on the server and never reaches the browser.
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.resolve(process.cwd(), 'public/data')
const cache = {}
function load(name) {
  if (!cache[name]) cache[name] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'))
  return cache[name]
}

const up = (s) => String(s ?? '').toUpperCase().trim()
const low = (s) => String(s ?? '').toLowerCase().trim()
const r2 = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)
const pick = (row, keys) => Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, r2(row[k])]))

// ---------------- tools ----------------
const TOOLS = {
  get_item_elasticity: {
    description: 'Module 2. Price elasticity, confidence interval, demand type and pricing recommendation for one M5 item (e.g. FOODS_3_090). Partial ids like 3_090 work.',
    parameters: { type: 'object', properties: { item_id: { type: 'string' } }, required: ['item_id'] },
    source: 'm2_elasticity_results.csv',
    run({ item_id }) {
      const q = up(item_id)
      const rows = load('m2_elasticity_results').filter((r) => up(r.item_id) === q || up(r.item_id).endsWith(q))
      if (!rows.length) return { error: `No elasticity estimate for ${item_id}. Only the 54 top-selling items were modelled.`, examples: [...new Set(load('m2_elasticity_results').map((r) => r.item_id))].slice(0, 8) }
      const r = rows[0]
      const failed = Math.abs(r.elasticity) > 50
      return {
        ...pick(r, ['item_id', 'cat_id', 'conf_interval', 'demand_type', 'pricing_recommendation', 'review_reason', 'naive_ols', 'fe_ols', 'share_weeks_kept']),
        elasticity: failed ? 'model failed (price barely varies)' : r2(r.elasticity),
        stores_in_estimate: rows.map((x) => x.store_id),
      }
    },
  },
  list_items_by_demand_type: {
    description: 'Module 2. List modelled items of one demand type: "Price-sensitive", "Less sensitive" or "Unclear", with elasticities.',
    parameters: { type: 'object', properties: { demand_type: { type: 'string' } }, required: ['demand_type'] },
    source: 'm2_elasticity_results.csv',
    run({ demand_type }) {
      const seen = new Set()
      const items = load('m2_elasticity_results')
        .filter((r) => low(r.demand_type) === low(demand_type) && !seen.has(r.item_id) && seen.add(r.item_id))
        .map((r) => ({ item_id: r.item_id, elasticity: Math.abs(r.elasticity) > 50 ? 'model failed' : r2(r.elasticity) }))
      return { demand_type, count: items.length, items }
    },
  },
  get_promotion_results: {
    description: 'Module 3. Promotion results for an item (optionally one store, e.g. CA_3): baseline vs promo sales, incremental margin, ROI and Continue/Reduce/Stop recommendation.',
    parameters: { type: 'object', properties: { item_id: { type: 'string' }, store_id: { type: 'string' } }, required: ['item_id'] },
    source: 'm3_promotion_uplift_results.csv',
    run({ item_id, store_id }) {
      const q = up(item_id), s = up(store_id)
      const rows = load('m3_promotion_uplift_results').filter((r) => (up(r.item_id) === q || up(r.item_id).endsWith(q)) && (!s || up(r.store_id) === s))
      if (!rows.length) return { error: `No promotions found for ${item_id}${store_id ? ' in ' + store_id : ''}.` }
      return {
        rows: rows.slice(0, 10).map((r) => pick(r, ['item_id', 'store_id', 'n_promotions', 'avg_discount', 'baseline_sales', 'promo_sales', 'incremental_units', 'incremental_margin', 'discount_cost', 'promotion_ROI', 'recommendation', 'reliability'])),
        total_matches: rows.length,
      }
    },
  },
  get_promotion_portfolio: {
    description: 'Module 3. Portfolio-level promotion results by discount depth, by category and by store, plus the sensitivity analysis.',
    parameters: { type: 'object', properties: {} },
    source: 'm3_portfolio_by_depth.csv, m3_portfolio_by_category.csv, m3_portfolio_by_store.csv, m3_sensitivity.csv',
    run() {
      const k = ['windows', 'volume_weighted_lift', 'portfolio_ROI', 'share_profitable']
      return {
        by_depth: load('m3_portfolio_by_depth').map((r) => pick(r, ['discount_depth', ...k])),
        by_category: load('m3_portfolio_by_category').map((r) => pick(r, ['cat_id', ...k])),
        by_store: load('m3_portfolio_by_store').map((r) => pick(r, ['store_id', ...k])),
        sensitivity: load('m3_sensitivity').map((r) => pick(r, ['min_baseline_per_day', 'stockout_windows_removed', ...k])),
      }
    },
  },
  break_even_lift: {
    description: 'Module 3. Sales multiple a promotion needs to break even: promo sales / baseline sales must exceed margin / (margin - discount). Give margin and discount as fractions, e.g. 0.25 and 0.15.',
    parameters: { type: 'object', properties: { margin: { type: 'number' }, discount: { type: 'number' } }, required: ['margin', 'discount'] },
    source: 'break-even formula (m3_break_even_lift.csv)',
    run({ margin, discount }) {
      const m = margin > 1 ? margin / 100 : margin, d = discount > 1 ? discount / 100 : discount
      if (d >= m) return { margin: m, discount: d, result: 'never breaks even: the discount sells at or below cost' }
      const x = m / (m - d)
      return { margin: m, discount: d, sales_multiple_needed: r2(x), lift_needed_pct: Math.round((x - 1) * 100) }
    },
  },
  get_markdown_recommendation: {
    description: 'Module 4. Markdown recommendation for one SKU number from the synthetic markdown dataset: stock, weeks of cover, recommended markdown, expected sales and margin, leftover stock, action.',
    parameters: { type: 'object', properties: { sku: { type: 'string' } }, required: ['sku'] },
    source: 'm4_markdown_recommendations.csv',
    run({ sku }) {
      const r = load('m4_markdown_recommendations').find((x) => String(x.SKU) === String(sku).replace(/\D/g, ''))
      return r ? pick(r, ['SKU', 'category', 'current_stock', 'weeks_cover', 'recommended_markdown', 'expected_sales', 'expected_margin', 'leftover_inventory', 'action']) : { error: `SKU ${sku} not found (SKUs are numbers 1 to 43400).` }
    },
  },
  get_markdown_summary: {
    description: 'Module 4. Best markdown by scenario (dataset elasticity vs elastic demand) and weeks left, and optimised per-SKU markdowns vs fixed rules.',
    parameters: { type: 'object', properties: {} },
    source: 'm4_markdown_by_scenario_and_weeks_left.csv, m4_optimised_vs_fixed_rules.csv',
    run() {
      return {
        by_scenario_and_weeks_left: load('m4_markdown_by_scenario_and_weeks_left').map((r) => pick(r, ['scenario', 'weeks_left', 'avg_markdown', 'share_marked_down', 'profit_gain_vs_no_markdown'])),
        optimised_vs_fixed: load('m4_optimised_vs_fixed_rules').map((r) => pick(r, ['scenario', 'rule', 'vs_no_markdown'])),
      }
    },
  },
  find_bundles: {
    description: 'Module 5. Products bought together with a given product (Instacart). Optional relationship filter: "complement" or "substitute". Leave product empty for the overall top pairs.',
    parameters: { type: 'object', properties: { product: { type: 'string' }, relationship: { type: 'string' } } },
    source: 'm5_bundle_candidates.csv',
    run({ product = '', relationship = '' }) {
      const p = low(product), rel = low(relationship)
      const rows = load('m5_bundle_candidates')
        .filter((r) => !p || low(r.antecedent).includes(p) || low(r.consequent).includes(p))
        .filter((r) => !rel || (rel.startsWith('sub') ? low(r.relationship_hint).startsWith('same') : low(r.relationship_hint).startsWith('different')))
        .sort((a, b) => b.user_lift - a.user_lift)
      return {
        total_matches: rows.length,
        pairs: rows.slice(0, 10).map((r) => pick(r, ['antecedent', 'consequent', 'n_users_together', 'confidence', 'lift', 'user_lift', 'relationship_hint', 'validation_status'])),
      }
    },
  },
}

const TOOL_SPECS = Object.entries(TOOLS).map(([name, t]) => ({ type: 'function', function: { name, description: t.description, parameters: t.parameters } }))

// ---------------- system prompt ----------------
function headline() {
  try {
    const items = {}
    for (const r of load('m2_elasticity_results')) items[r.item_id] = r.demand_type
    const types = Object.values(items)
    const n = (t) => types.filter((x) => x === t).length
    const rois = load('m3_sensitivity').map((r) => r.portfolio_ROI)
    const bundles = load('m5_bundle_candidates')
    return [
      `Module 2: ${types.length} items modelled; ${n('Price-sensitive')} price-sensitive, ${n('Less sensitive')} less sensitive, ${n('Unclear')} unclear.`,
      `Module 3: portfolio promotion ROI between ${Math.max(...rois).toFixed(2)} and ${Math.min(...rois).toFixed(2)} across sensitivity settings; deeper discounts lose more.`,
      `Module 4: at the dataset's own elasticity (-0.33) the best markdown is 0%; markdowns only pay if demand is elastic.`,
      `Module 5: ${bundles.length} pairs with lift > 1.5; same-aisle pairs are likely substitutes, cross-aisle pairs possible complements; all need cross-price validation.`,
    ].join('\n')
  } catch {
    return ''
  }
}

const SYSTEM = `You are the assistant inside the Retail Decision Engine, a dashboard that answers four questions for a retailer:
regular price (Module 2, DoubleML elasticity on Walmart M5), promotions (Module 3, incremental margin and ROI on M5),
markdowns (Module 4, profit simulation on a synthetic beauty dataset) and bundles (Module 5, market basket on Instacart).

Rules:
- Answer only from the tool results and the facts below. Never invent numbers. If the data does not cover the question, say so plainly.
- Call a tool whenever the question is about a specific item, store, SKU, product or figure.
- Keep answers short: 2 to 6 sentences or a few bullets. Give the recommendation first, then the numbers behind it.
- Name the source file at the end, like: (Source: m2_elasticity_results.csv).
- Mention a key caveat when relevant: margins are assumptions (Foods 25%, Household 35%, Hobbies 40%); elasticities are closer to promotional than regular-price responses; Module 4 data is synthetic; bundle pairs are untested on prices.
- ROI of -1 means the whole discount was lost. Elasticity below -1 means price-sensitive.

Headline results:
${headline()}`

// ---------------- Azure call ----------------
async function callAzure(messages) {
  const { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_API_VERSION, AZURE_CHAT_DEPLOYMENT } = process.env
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_CHAT_DEPLOYMENT) throw new Error('Azure OpenAI settings missing: check the .env file')
  const url = `${AZURE_OPENAI_ENDPOINT.replace(/\/+$/, '')}/openai/deployments/${AZURE_CHAT_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION || '2024-12-01-preview'}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': AZURE_OPENAI_API_KEY },
    body: JSON.stringify({ messages, tools: TOOL_SPECS, tool_choice: 'auto', max_completion_tokens: 2000 }),
  })
  if (!res.ok) throw new Error(`Azure OpenAI error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

export async function chat(history) {
  const clean = (Array.isArray(history) ? history : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
  const messages = [{ role: 'system', content: SYSTEM }, ...clean]
  const sources = new Set()

  for (let round = 0; round < 5; round++) {
    const data = await callAzure(messages)
    const msg = data.choices?.[0]?.message
    if (!msg) throw new Error('Empty response from Azure OpenAI')
    if (!msg.tool_calls?.length) return { reply: msg.content || '', sources: [...sources] }

    messages.push({ role: 'assistant', content: msg.content || null, tool_calls: msg.tool_calls })
    for (const call of msg.tool_calls) {
      const tool = TOOLS[call.function?.name]
      let result
      try {
        result = tool ? tool.run(JSON.parse(call.function.arguments || '{}')) : { error: 'unknown tool' }
        if (tool) sources.add(tool.source)
      } catch (e) {
        result = { error: e.message }
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 8000) })
    }
  }
  return { reply: 'Sorry, I could not finish that answer. Please try rephrasing.', sources: [...sources] }
}
