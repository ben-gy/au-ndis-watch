# NDIS Watch (AU) — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/au-ndis-watch/ *(redirects to custom domain once DNS is set)*
- **Custom domain:** https://au-ndis-watch.benrichardson.dev

## What it is

A searchable explorer for the NDIS Commission's full public Enforcement Register — 3,203 compliance actions (banning orders, registration revocations, suspensions, refusals to re-register, compliance notices, enforceable undertakings) under the *National Disability Insurance Scheme Act 2013*, sourced from data.gov.au.

7 views: Browse (search + drill-down), Map (state bubbles), Timeline (stacked monthly bars), Types (donut + cross-reference matrix), States (per-100k leaderboard), Service groups (flow diagram), Insights (auto-generated findings). Plain-language glossary tooltips and an About modal throughout.

## DNS / cert

DNS CNAME `au-ndis-watch → ben-gy.github.io` is already created in Cloudflare and the GitHub Pages CNAME is set. If the TLS cert isn't live yet, cycle it:

```bash
gh api repos/ben-gy/au-ndis-watch/pages -X PUT -f cname=""
sleep 3
gh api repos/ben-gy/au-ndis-watch/pages -X PUT -f cname="au-ndis-watch.benrichardson.dev"
```
