# Retail Price & Promotion Decision Engine

Decision engine answering four questions:
1. Should we change the regular price?  -> Module 2 (Price Elasticity)
2. Should we run a promotion?           -> Module 3 (Promotion Uplift)
3. Should we mark down slow stock?      -> Module 4 (Markdown Optimization)
4. What should we bundle / cross-sell?  -> Module 5 (Market Basket)

Module 1 builds the clean data foundation from M5.

## Structure
- data/raw/        raw Kaggle downloads (not committed)
- data/processed/  cleaned tables (not committed)
- notebooks/       one notebook per module
- src/             reusable code
- outputs/         result tables and figures
- dashboard/       final dashboard
- docs/            papers and write-ups
- assumptions.md   every assumption made
