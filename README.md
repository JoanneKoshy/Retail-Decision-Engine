# Retail Price & Promotion Decision Engine

A decision engine that answers four pricing questions for a retailer, with every recommendation backed by data and traceable to the notebook that produced it.

| # | Business question | Module | Method | Data |
|---|---|---|---|---|
| 1 | *(foundation)* | Data foundation | Reshape, join, derive promotion flag | Walmart M5 |
| 2 | Should we change the regular price? | Price elasticity | DoubleML (causal ML) vs naive OLS | Walmart M5 |
| 3 | Should we run a promotion? | Promotion uplift | Incremental units, margin and ROI vs pre-promotion baseline | Walmart M5 |
| 4 | Should we mark down slow-moving stock? | Markdown optimisation | Profit simulation with salvage value | Retail Markdown (synthetic) |
| 5 | Which products should we bundle? | Market basket | Pair support / confidence / lift, substitute vs complement check | Instacart |

The results are presented in a React dashboard with an AI assistant ("Ask the engine") that answers questions from the same output files.

---

## Key findings

- **Regular price:** 20 of the 54 top-selling items are price-sensitive (elasticity below −1), 4 are less sensitive, 30 are unclear and flagged for review. Estimates come mainly from temporary price drops, so a controlled price test is recommended before changing regular prices.
- **Promotions:** short promotions lose money as a portfolio under the assumed margins: return on discount spend of −0.85 to −1.15 across all sensitivity settings, with at most 10% of promotions paying back. Deeper discounts lose more.
- **Markdowns:** at the dataset's own price response (elasticity −0.33) the best markdown is 0%. Under elastic demand (−2.0), per-SKU optimised markdowns beat a fixed 30% rule by about $22.3 M (synthetic data).
- **Bundles:** 1,576 pairs have lift above 1.5. The strongest are substitutes (flavours of the same product); the 1,173 cross-aisle pairs are the bundle candidates. All need cross-price validation.

Biggest lesson: data design (weekly data, pooling, removing stock-out weeks) changed the results far more than the choice of model.

---

## Repository structure

```text
retail-decision-engine/
├── notebooks/ # One Kaggle notebook per module (the code behind every number)
│   ├── m5-module1-data-foundation.ipynb
│   ├── m5-module2-price-elasticity.ipynb
│   ├── m5-module3-promotion-uplift.ipynb
│   ├── m5-module4-markdown-optimization.ipynb
│   └── m5-module5-market-basket.ipynb
├── outputs/
│   ├── tables/ # 34 output tables (m1_ to m5_ CSVs)
│   └── figures/ # Charts produced by the notebooks
├── src/
│   └── export_for_dashboard.py # Converts outputs/tables/*.csv to JSON for the dashboard
├── dashboard/ # React app + chat server
│   ├── src/ # Pages, components, chat window
│   ├── server/ # Chat backend (Azure OpenAI with tool calls)
│   └── public/data/ # JSON copies of the output tables
├── docs/papers/ # Reference papers
├── assumptions.md # Every assumption behind the numbers
└── requirements.txt
```

---

## How to reproduce the analysis

The analysis runs on **Kaggle Notebooks** (datasets attach directly, 30 GB RAM). The clean M5 table (46.9 M rows) is too large to keep locally.

1. Create the five notebooks on Kaggle from the files in `notebooks/`.
2. Attach the inputs:
   - Modules 1: [M5 Forecasting](https://www.kaggle.com/competitions/m5-forecasting-accuracy/data) (join the competition first)
   - Modules 2 and 3: the output of the Module 1 notebook
   - Module 4: [Retail Markdown Optimization](https://www.kaggle.com/datasets/arbaaztamboli/retail-markdown-optimization-discounts-and-sales)
   - Module 5: [Instacart Market Basket Analysis](https://www.kaggle.com/datasets/psparks/instacart-market-basket-analysis)
3. For Module 2, turn **Internet on** (it installs `doubleml`).
4. Run each notebook with **Save Version → Save & Run All**, in order 1 → 5.
5. Download the `m1_` to `m5_` CSV and PNG outputs into `outputs/tables` and `outputs/figures`.

---

## How to run the dashboard

Requires Node.js 20+ and Python 3 with pandas.

```powershell
# 1. Convert the output tables to JSON (from the project root)
python src\export_for_dashboard.py

# 2. Install the dashboard (first time only)
cd dashboard
npm install

# 3. Start the dashboard
npm run dev                 # open http://localhost:5173
```

### AI assistant (optional)

The assistant needs Azure OpenAI credentials. Create `dashboard/.env` (it is git-ignored and must never be committed):

```dotenv
AZURE_OPENAI_ENDPOINT=<your endpoint>
AZURE_OPENAI_API_KEY=<your key>
AZURE_OPENAI_API_VERSION=2025-04-01-preview
AZURE_CHAT_DEPLOYMENT=<your chat deployment name>
```

Then, in a second terminal:

```powershell
cd dashboard
npm run server              # chat server on http://localhost:8787
```

The key stays on the server; the browser only talks to `/api/chat`. The assistant answers only from the project's output files, using lookup tools, and names its source in every answer.

---

## Dashboard pages

| Page | What it shows | Main source |
|---|---|---|
| Overview | One card per business question with headline number and verdict | All modules |
| Regular price | Elasticity per item, DoubleML vs naive, recommendations | `m2_elasticity_results.csv` |
| Promotions | ROI by depth, break-even calculator, Continue / Reduce / Stop per SKU-store | `m3_*.csv` |
| Markdowns | Profit by markdown level and weeks left, optimised vs fixed rules, per-SKU actions | `m4_*.csv` |
| Bundles | Top candidates, complements vs substitutes, all pairs | `m5_*.csv` |
| Assumptions | Every assumption in one table | `assumptions.md` |

Design follows the brief: card-based, Monday.com style, no green. Status colours: blue = go, amber = caution, coral = stop, purple = info, grey = unclear.

---

## Assumptions and limitations

All assumptions are listed in [`assumptions.md`](assumptions.md). The most important:

- **Margins** (Foods 25%, Household 35%, Hobbies 40%) come from the brief, not real cost data; Module 3's conclusion depends on them.
- **Stock-outs** are inferred from zero-sales days, since M5 has no inventory data.
- **Promotion** = a price at least 10% below the 8-week regular price, analysed as windows of up to 2 weeks.
- **Module 4** uses synthetic data with assumed unit cost (50% of price), salvage value (20% of cost) and a 12-week season.
- **Module 5** has no prices, so every bundle candidate is marked "Needs cross-price validation".

---

## References

- Ailawadi, Harlam, César & Trounce (2006). *Promotion Profitability for a Retailer.* Journal of Marketing Research 43(4).
- Caro & Gallien (2012). *Clearance Pricing Optimization for a Fast-Fashion Retailer.* Operations Research 60(6).
- Vindevogel, Van den Poel & Wets (2005). *Why Promotion Strategies Based on Market Basket Analysis Do Not Work.* Expert Systems with Applications.
- [DoubleML documentation](https://docs.doubleml.org) · [mlxtend](https://rasbt.github.io/mlxtend/) · [CausalML](https://github.com/uber/causalml)

---

## Status

| Part | Status |
|---|---|
| Modules 1–5 | Complete; notebooks and outputs committed |
| Dashboard | Complete; runs locally |
| AI assistant | Built; connected to Azure OpenAI |
| Deployment | Planned (Vercel) |
| Module 3 phase 2 (CausalML uplift) | Not started |
