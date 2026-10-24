// GET /api/inspection?flight=1|2
// Result of a drone flight: defects on the map, power and money lost, what to fix first.
import { computeInspection } from "../public/engine.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(computeInspection(String(req.query.flight || "1")));
}
