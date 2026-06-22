# NDIS Watch (AU)

**Every NDIS Commission compliance action — banning orders, registration revocations, civil penalties and infringements — searchable, mappable, and explained in plain language.**

🔗 **Live:** [https://au-ndis-watch.benrichardson.dev](https://au-ndis-watch.benrichardson.dev)

## What is this?

NDIS Watch turns the NDIS Quality and Safeguards Commission's public Enforcement Register into a searchable explorer. The Commission publishes every formal action it takes under the *National Disability Insurance Scheme Act 2013* — banning orders against individual workers, revocations of provider registration, suspensions, compliance notices, and enforceable undertakings — as a CSV on data.gov.au. The official view is a chronological list with no filters, no maps, no insights.

This site loads all ~3,200 actions into one interface where you can:

- Look up a specific person or company by name in seconds
- See the geographic concentration of enforcement on a map
- Compare states on raw counts and per-100k-population rates
- Visualise enforcement intensity over time
- Drill into any entity to see every action against them with full narrative

## Who is this for?

- **Families of NDIS participants** vetting a new support worker or provider before letting them into the home
- **NDIS plan managers and support coordinators** screening providers before making referrals
- **Disability advocates and journalists** tracking enforcement patterns by state, sector, or time
- **Sector researchers** monitoring how the Commission’s regulatory posture is changing

## Data Sources

| Source | What it provides | Update frequency |
|--------|------------------|-----------------|
| [NDIS Commission Compliance Actions](https://data.gov.au/data/dataset/ndis-commission-provider-register-part-2) (data.gov.au) | Type, dates, name, ABN, city, state, postcode, registration groups, narrative — for every published action | Weekly |
| ABS Estimated Resident Population (June 2024) | State populations for per-100k rate calculations | Annual |

## Features

- **Browse view** — Searchable, filterable table of every action with drill-down detail panel
- **Map view** — Interactive Leaflet map with proportional bubbles per state, click to filter
- **Timeline view** — Stacked monthly bar chart spanning the full register (2019 onwards)
- **Types view** — Donut + cross-reference matrix showing service-category × action-type relationships
- **States view** — Leaderboard ranked by raw count and per-100k population, with severity-mix breakdown
- **Service groups view** — Sankey-style flow diagram from service category to action type
- **Insights view** — Auto-generated findings: recent banning orders, year-over-year change, repeat-action entities, statistical outliers
- **Glossary tooltips** — Click the ⓘ next to any legal term for a plain-language definition
- **About modal** — Source, methodology, caveats, and privacy notes

## Tech Stack

- **Runtime:** Vanilla TypeScript (no React, no Tailwind)
- **Build:** Vite 6
- **Testing:** Vitest (81 unit tests)
- **Map:** Leaflet 1.9 with OpenStreetMap tiles
- **Charts:** Hand-rolled SVG (no D3, no Chart.js)
- **Data:** GitHub Actions pipeline → `public/data/*.json` (static)
- **Hosting:** GitHub Pages (static, no backend)

## Local Development

```bash
# Install dependencies
npm install

# Refresh data from data.gov.au (writes pipeline/raw/source.csv)
npm run data:collect
npm run data:aggregate

# Or do both in one go
npm run data:all

# Start dev server
npm run dev

# Run tests (81)
npm test

# Production build
npm run build

# Preview production build
npm run preview
```

## How it works

1. **`pipeline/collect.mjs`** queries data.gov.au's CKAN API for the most recently modified NDIS Commission Compliance Actions dataset and downloads its CSV.
2. **`pipeline/aggregate.mjs`** parses the CSV with our own RFC 4180 parser, normalises action types into stable codes (`banning_order`, `revocation`, …) and severity buckets (red / amber / slate), classifies the messy "Registration Groups" field into seven service categories, and writes three JSON files to `public/data/`: the full `actions.json`, summary `stats.json`, and `meta.json`.
3. **GitHub Actions** runs the pipeline every Monday at 18:23 UTC and commits any updates.
4. The frontend (`src/main.ts`) loads the three JSON files at boot, parses the URL hash for state (active view, filters, drill-down entity), and renders one of seven views. All filtering and sorting happens client-side.

## Privacy & accuracy

All names and details on this site come directly from the NDIS Commission’s public register, which the Commission is required to maintain under the NDIS Act. If you believe a record is inaccurate, contact the Commission — we mirror their data verbatim.

An action against a person or company with a similar name to one you know **is not necessarily the same individual**. Always verify against the official register at the [NDIS Commission](https://www.ndiscommission.gov.au/about/regulatory-publications/compliance-and-enforcement-actions).

## License

MIT
