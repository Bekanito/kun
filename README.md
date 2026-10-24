# Kün — AI inspector for solar plants

**Kün** ("sun" in Kazakh) finds broken and dusty panels on solar plants in Kazakhstan
from thermal drone photos and shows how much money each problem costs the plant every day.

**Live demo:** https://kun-wine.vercel.app

- Kazakhstan has 46 solar plants with 1,222.61 MW in total (Kapital.kz, 2025).
- On average, solar plants lose **5.08%** of their power to defects; plants with regular drone flights lose about 3% (Raptor Maps, Global Solar Report 2026).
- Every kWh the sun does not give, the city makes up with coal: combined heat and power plants make 66.2% of Kazakhstan's electricity (Kapital.kz, 2024).

> Demo data, the plant is made up.

## What the platform does

| Part | File | What it does |
|---|---|---|
| Frontend | `public/index.html` | Plant map with problems, thermal photo, "what to fix first", before/after repair flights, payback calculator |
| Logic | `public/engine.js` | 50 MW plant, 7 problem types (junction box, panel chain, inverter, dust, hot spot, diode, grass), kW → ₸ |
| Backend | `api/inspection.js` | `GET /api/inspection?flight=1\|2` — result of a drone flight |
| Backend | `api/value.js` | `GET /api/value?mw=26.6&tariff=34.61` — what a plant loses, what Kün brings back, price, payback |
| Backend | `api/workorder.js` | `GET /api/workorder?flight=1` — work order for the repair crew |

The frontend gets data from the backend. If the site runs as static files (for example GitHub Pages), the same `engine.js` runs in the browser.

### How we turn kW into money
- 1,400 kWh per kW of panels per year in southern Kazakhstan — assumption.
- 34.61 ₸ per kWh excl. VAT — fixed tariff for solar plants (Government Decree No. 645, 12.06.2014).
- 1 kW lost ≈ 132.8 ₸ per day.
- Kün price: 300,000 ₸ per MW per year — our assumption.

## Run locally

Node.js 18+ only, no dependencies.

```bash
npm start
# http://localhost:3000
```

## Deploy

Vercel → Add New → Project → Import this repository → Preset **Other** → Deploy.
