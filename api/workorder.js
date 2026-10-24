// GET /api/workorder?flight=1|2
// Наряд-задание для бригады: что чинить, где, в каком порядке.
import { buildWorkOrder } from "../public/engine.js";

export default function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(buildWorkOrder(String(req.query.flight || "1")));
}
