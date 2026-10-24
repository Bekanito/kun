// GET /api/workorder?flight=1|2
// Work order for the repair crew: what to fix, where, and in what order.
import { buildWorkOrder } from "../public/engine.js";

export default function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(buildWorkOrder(String(req.query.flight || "1")));
}
