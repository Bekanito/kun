// GET /api/inspection?flight=1|2
// Результат облёта станции: дефекты на карте, потеря мощности и денег, приоритеты ремонта.
import { computeInspection } from "../public/engine.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(computeInspection(String(req.query.flight || "1")));
}
