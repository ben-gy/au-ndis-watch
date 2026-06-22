# Site Plan: NDIS Watch (AU)

## Overview
- **Name:** NDIS Watch (AU)
- **Repo name:** au-ndis-watch
- **Tagline:** Every NDIS Commission compliance action — banning orders, registration revocations, civil penalties and infringements against providers and workers, made searchable.

## Target Audience
Families of NDIS participants vetting potential support workers and providers; NDIS plan managers and support coordinators screening providers before referrals; disability advocates and journalists tracking enforcement patterns; sector researchers monitoring regulatory activity. Most users come to look up a specific name (worker or company) or to understand what enforcement has happened in their state recently.

## Value Proposition
The NDIS Commission publishes every compliance action as a CSV on data.gov.au, but the only existing interface is a long static list on the Commission's site. NDIS Watch turns it into a searchable, mappable, drill-down explorer so a parent can answer "is this support worker banned?" in seconds, and a journalist can answer "which states have seen the most enforcement against group-home providers this year?" without writing SQL.

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|-------------------|-----------------|----------------|
| NDIS Commission Compliance Actions | https://data.gov.au/data/dataset/ndis-commission-provider-register-part-2 | Type, dates, name, ABN, city, state, postcode, registration groups, narrative — for every banning order, revocation, civil penalty, infringement, compliance notice, and enforceable undertaking under the NDIS Act 2013 | ~Weekly (the Commission publishes a new CSV under a fresh URL each week) | No |
| ABS State Population (ERP June 2024) | https://www.abs.gov.au/statistics/people/population/national-state-and-territory-population | Population by state — used to compute per-100k enforcement rates | Annual | No |

## Key Features
1. **Name search** — Type a person or company name; results highlight every action against them
2. **State + type + year filters** — Combine filters to narrow the 3,200+ actions
3. **Drill-down panel** — Click any name to see every action with full narrative, dates, registration groups
4. **National map** — Leaflet map of action density by state, colour-coded by severity (banning vs notice)
5. **Timeline** — Actions by month showing enforcement intensity over time
6. **Type breakdown** — Banning orders vs revocations vs civil penalties vs infringements with definitions
7. **Insights** — Auto-detected patterns: repeat-action entities, monthly surges, state per-capita outliers, recent permanent bans
8. **About + glossary** — Plain-language explanations of every legal term (banning order, civil penalty, ER, etc.)

## Target Audience (detailed)
NDIS participants and their families are often older parents or carers under stress, vetting a new worker before letting them into the home. They are not legally trained — they don't know what "section 73J revocation" means. They are searching by name on a phone, late at night, after a Facebook post raised a concern. The site must feel calm, trustworthy, and authoritative — not sensational. Plain language and visible disclaimers ("an action against a similarly-named entity does not mean this person") are essential.

A second audience — journalists and sector researchers — uses the site on desktop to find patterns: "show me every revocation in Queensland in the last 12 months." They need export-friendly tables and clear timestamps.

## Style Direction
**Tone:** authoritative-but-accessible, civic, calm
**Colour palette:** Navy and white with red and amber severity accents — feels like a public register (ASIC banning, AHPRA register, electoral roll). Severity colour drives the visualization: red for banning orders and revocations, amber for civil penalties and infringements, slate for notices and undertakings. Why: the audience is anxious people checking on someone's safety; we need a calm, official feel with severity instantly readable.
**UI density:** Balanced — enough whitespace to feel safe, but information-dense enough to support fast scanning of a 3,200-row table.
**Dark/light theme:** Light — civic/consumer audience, must feel like a government register, not a hacker terminal.
**Reference sites for tone:** ASIC Banned & Disqualified Register, AHPRA Public Register, fuelaustralia.org (clean utility), au-hospitals.benrichardson.dev

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite
- **Data strategy:** pipeline — Node script fetches latest CSV from data.gov.au, parses, normalises severity, geocodes by postcode centroid, writes `public/data/actions.json` + `public/data/stats.json` + `public/data/lookup.json`
- **Key libraries:** Leaflet 1.9 + @types/leaflet (national choropleth map)

## Layout
- Fixed top header (52px): brand + view tabs (Browse / Map / Timeline / Types / States / Insights) + About button (?)
- Main content fills remaining viewport, 1600px max-width centred
- Browse view: left column filters (sticky), right column results table with pagination + drill-down panel slides in from right (45% width)
- Map view: full-width Leaflet with state choropleth + click-state to filter
- Other analytic views: 12-column grid with chart cards
- Mobile (<768px): filters collapse into a drawer; tabs scroll horizontally; drill-down is full-screen

## Pages/Views
1. **Browse** (default) — searchable, filterable table with drill-down
2. **Map** — state choropleth with action count, click a state to filter the table
3. **Timeline** — monthly bar chart (last 5 years) split by action type
4. **Types** — donut + bar showing breakdown of the 8+ action types with definitions
5. **States** — leaderboard with raw and per-100k-population rates, comparison to national average
6. **Insights** — auto-generated cards: repeat offenders, recent permanent bans, surge months, registration-group concentration

## Visualization Strategy
1. **Sortable, filterable table (Browse)** — primary lookup. Without it the site is useless to the people who search by name.
2. **Choropleth map (Map)** — instantly answers "where is enforcement happening?" and shows NT/TAS outliers that the table buries.
3. **Stacked timeline bar chart (Timeline)** — reveals enforcement intensity over time and whether banning vs registration-action mix has shifted. Spot the COVID-era patterns and the 2025 surge.
4. **Donut + horizontal bar of types (Types)** — answers "what does enforcement actually look like?" — most users assume it's all bannings; in fact infringements and compliance notices dominate.
5. **State leaderboard (States)** — ranks by raw count and per-100k-population, colour-coded against the median, with a callout when a state is >2× the national rate. The per-capita view is essential — NSW will always lead on raw count but TAS or NT may lead per capita.
6. **Cross-reference matrix (Types view, secondary)** — rows = top 12 registration groups, columns = action types, cell intensity = count. Reveals which service categories attract which enforcement. e.g. "are most banning orders in 0125 (community participation)?"
7. **Drill-down panel (anywhere)** — clicking a name opens a slide-in panel with the entity's full action history, mini-timeline, and a "similar entities" section.
8. **Insights cards (Insights)** — narrative auto-findings: "5 entities have 3+ separate actions in 2026", "QLD permanent bans up 40% YoY", "Group 136 (centre-based activities) has the highest revocation rate".

Every visualization is interactive (hover, click to filter, click to drill down). All colour is consistent: severity drives every chart's palette, registration groups have a stable colour map across views.
