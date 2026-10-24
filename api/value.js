// GET /api/value?mw=26.6&tariff=34.61&loss=5.08
// Сколько станция теряет в год, сколько Kün вернёт и сколько стоит подписка.
import { valueFor, ECON } from "../public/engine.js";

export default function handler(req, res) {
  const mw = Number(req.query.mw ?? 26.6);
  const tariff = Number(req.query.tariff ?? ECON.tariffKztPerKwh);
  const loss = Number(req.query.loss ?? ECON.avgLossPct);
  if (![mw, tariff, loss].every((n) => Number.isFinite(n) && n > 0) || mw > 5000 || loss > 50) {
    return res.status(400).json({ error: "Нужны положительные mw (до 5000), tariff и loss (до 50%)" });
  }
  res.status(200).json(valueFor(mw, tariff, loss));
}
