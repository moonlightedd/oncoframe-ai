# ONCOFRAME AI

**Explainable Lung CT Nodule-Candidate Classification Research Tool**

A browser-based research and education prototype for classifying lung CT nodule candidates using image features. All machine learning runs entirely in the browser — no backend, no data uploads.

> **Research and education prototype. Not clinically validated. Not for diagnosis.**
> A nodule candidate is NOT a cancer diagnosis.

## Quick Start

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Building

```bash
npm run build      # production build
npm run preview    # preview the production build
npm run typecheck  # TypeScript type checking
npm run test       # run Vitest unit tests
```

## Expected CSV Schema

Upload a `features.csv` file with the following columns:

| Column         | Type    | Required | Description                                    |
|----------------|---------|----------|------------------------------------------------|
| `candidate_id` | string  | Yes      | Unique identifier per candidate               |
| `group_id`     | string  | Yes      | Scan/series identifier (used for grouped split)|
| `coordX`       | numeric | Yes      | X coordinate in the CT volume                 |
| `coordY`       | numeric | Yes      | Y coordinate in the CT volume                 |
| `coordZ`       | numeric | Yes      | Z coordinate in the CT volume                 |
| `label`        | 0/1     | Yes      | 1 = annotated nodule candidate, 0 = non-nodule |
| Feature cols   | numeric | Yes      | Any numeric image features (e.g. mean_hu, std_hu, entropy, gradient_mean) |

### Optional Files

- **`data_dictionary.csv`**: columns `column, type, description, source`
- **`audit.json`**: file counts, row counts, license note

## Pages

1. **Dataset Audit** — Upload CSV, view row/group counts, class balance, missing values, duplicates, summary stats, 5,000-row check
2. **Data Dictionary** — Uploaded or auto-generated column metadata
3. **Candidate Explorer** — Filterable/sortable table, histograms, scatter plots
4. **Train Models** — Grouped split (seed 42, 80/20 by group), Logistic Regression + Random Forest in a Web Worker
5. **Evaluation** — Confusion matrix, accuracy/precision/recall/specificity/F1, ROC/PR curves, calibration, bootstrap CIs, model comparison, export
6. **Explainability** — RF feature importances, LR standardized coefficients
7. **Error Analysis** — False positives/negatives, binned by feature, auto-generated summary
8. **Predict** — Select test candidate or enter values manually
9. **Limitations & Roadmap** — Feature status, known limitations, dataset attribution, future plans

## Testing

```bash
npm run test
```

Tests cover:
- Group split has zero overlap between train and test
- Metrics match hand-computed values on tiny synthetic arrays
- Bootstrap is reproducible with a fixed seed
- CSV validation rejects bad/missing columns
- Empty state renders with no data loaded

## Troubleshooting

### Large files (>50,000 rows)
- Training runs in a Web Worker but very large datasets may still be slow
- Consider reducing the number of features or splitting your CSV offline

### Parse errors
- Ensure all required columns exist: `candidate_id`, `group_id`, `label`
- All feature columns must be fully numeric (no text values)
- Check for encoding issues — save as UTF-8 CSV

### Slow training
- Random Forest uses 40 trees with max depth 8 — this is capped for browser responsiveness
- Logistic Regression runs 800 epochs of gradient descent
- Both run in a background thread (Web Worker) so the UI stays responsive

## Data Privacy

All data is processed in-memory in the browser. Nothing is sent to any server. Nothing is stored in localStorage. Closing the tab clears all data.

## Dataset Attribution

- **LUNA16 Challenge**: https://luna16.grand-challenge.org/Data/
- **LIDC-IDRI**: The Cancer Imaging Archive (TCIA)
- **Kaggle mirror**: user sutrisna98

**You must verify the dataset license at the LUNA16 link above before using this tool with real data.**

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- PapaParse (CSV parsing)
- Recharts (charts)
- Vitest (testing)
- Web Workers (non-blocking training)
- lucide-react (icons)

## Branding

- Navy: `#0B1F3A`
- Teal: `#14B8A6`
- Text logo: "ONCOFRAME AI"
