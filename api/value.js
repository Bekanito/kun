// GET /api/value?mw=26.6&tariff=34.61&loss=5.08
// How much a plant loses per year, how much Kün brings back, and what the subscription costs.
import { valueFor, ECON } from "../public/engine.js";

export default function handler(req, res) {
  const mw = Number(req.query.mw ?? 26.6);
  const tariff = Number(req.query.tariff ?? ECON.tariffKztPerKwh);
  const loss = Number(req.query.loss ?? ECON.avgLossPct);
  if (![mw, tariff, loss].every((n) => Number.isFinite(n) && n > 0) || mw > 5000 || loss > 50) {
    return res.status(400).json({ error: "Need positive mw (up to 5000), tariff, and loss (up to 50%)" });
  }
  res.status(200).json(valueFor(mw, tariff, loss));
}
