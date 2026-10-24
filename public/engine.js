// Kün platform logic. One file for the server (api/*.js) and the browser (static fallback).
// The plant layout and flights are demo data. Economics have sources or are marked as assumptions.

export const ECON = {
  // Fixed tariff for solar plants: 34.61 KZT/kWh excl. VAT (Government Decree of Kazakhstan No. 645, 12.06.2014)
  tariffKztPerKwh: 34.61,
  // Yearly output of 1 kW of panels in southern Kazakhstan: assumption
  yieldKwhPerKwYear: 1400,
  // Average power lost to defects: 5.08% (Raptor Maps, Global Solar Report 2026, 373 GW)
  avgLossPct: 5.08,
  // Plants with regular drone flights lose about 3% (same source)
  droneLossPct: 3.0,
  // Kün price: 300,000 KZT per MW per year — our assumption
  priceKztPerMwYear: 300000,
};

const DAY_KWH_PER_KW = ECON.yieldKwhPerKwYear / 365;
const KZT_PER_KW_DAY = DAY_KWH_PER_KW * ECON.tariffKztPerKwh; // ≈ 132.8 KZT per day for 1 kW

export const PLANT = {
  id: "demo-kun",
  name: "Demo Kün Solar Plant",
  region: "Zhambyl Region (demo)",
  capacityKw: 50000,
  panels: 90720,
  blocks: [], // filled in below
};

// 10 blocks of 5 MW: 2 rows × 5. Each block has 12 rows × 6 tables. One table ≈ 69.4 kW (126 panels).
const BLOCK_W = 180, BLOCK_H = 262, GAP_X = 12, GAP_Y = 34, X0 = 26, Y0 = 44;
const ROWS = 12, COLS = 6, TABLE_KW = PLANT.capacityKw / (10 * ROWS * COLS);
for (let i = 0; i < 10; i++) {
  const r = Math.floor(i / 5), c = i % 5;
  PLANT.blocks.push({
    id: `B-${i + 1}`,
    inverter: `INV-${i + 1}`,
    x: X0 + c * (BLOCK_W + GAP_X),
    y: Y0 + r * (BLOCK_H + GAP_Y),
    w: BLOCK_W,
    h: BLOCK_H,
    rows: ROWS,
    cols: COLS,
    kw: 5000,
  });
}

export const DEFECT_TYPES = {
  combiner: { name: "Broken junction box", short: "Junction box", action: "Replace the fuses and check the junction box", crew: "Electrician", hours: 3 },
  string: { name: "Chain of panels switched off", short: "Panel chain", action: "Check the plugs and the fuse of this panel chain", crew: "Electrician", hours: 1 },
  inverter: { name: "Inverter losing power", short: "Inverter", action: "Service the inverter: clean filters and fans, read the error log", crew: "Manufacturer service", hours: 4 },
  soiling: { name: "Dust on panels", short: "Dust", action: "Wash the panels near the dirt road", crew: "Cleaning team", hours: 6 },
  hotspot: { name: "Hot spot in a panel", short: "Hot spot", action: "Replace the panel under the maker's warranty", crew: "Installer", hours: 0.5 },
  diode: { name: "Burnt diode in a panel", short: "Diode", action: "Replace the panel under the maker's warranty", crew: "Installer", hours: 0.5 },
  vegetation: { name: "Grass shading panels", short: "Grass", action: "Cut the grass in front of the row", crew: "Groundskeeper", hours: 1 },
};

// Seeded generator: the same data on any server and in the browser
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tablePos(block, row, col) {
  const tw = 26, th = 14, gx = 3, gy = 6;
  const left = block.x + (block.w - (COLS * tw + (COLS - 1) * gx)) / 2;
  return { x: left + col * (tw + gx), y: block.y + 30 + row * (th + gy), w: tw, h: th };
}

function placeOf(type, block, row, col, area) {
  if (type === "inverter") return `block ${block.id}, inverter ${block.inverter}`;
  if (type === "soiling" && area) return `block ${block.id}, rows ${area.rowFrom + 1}–${area.rowTo + 1}`;
  if (type === "combiner") return `block ${block.id}, whole row ${row + 1}`;
  return `block ${block.id}, row ${row + 1}, table ${col + 1}`;
}

function buildDefects() {
  const rand = rng(20261024);
  const list = [];
  const add = (type, blockIdx, row, col, lossKw, extra = {}) => {
    const block = PLANT.blocks[blockIdx];
    const pos = tablePos(block, row, col);
    list.push({
      id: `D-${String(list.length + 1).padStart(3, "0")}`,
      type,
      block: block.id,
      row: row + 1,
      table: col + 1,
      x: pos.x + pos.w / 2,
      y: pos.y + pos.h / 2,
      lossKw: Math.round(lossKw * 10) / 10,
      place: placeOf(type, block, row, col, extra.area),
      tempDelta: extra.tempDelta ?? null,
      area: extra.area ?? null,
      fixedOnFlight2: extra.fixed ?? true,
    });
  };
  // Big ones: they eat the most money
  add("combiner", 2, 4, 0, TABLE_KW * COLS, { tempDelta: 18, area: { block: 2, rowFrom: 4, rowTo: 4 } });
  add("combiner", 5, 9, 0, TABLE_KW * COLS, { tempDelta: 16, area: { block: 5, rowFrom: 9, rowTo: 9 } });
  add("inverter", 6, 11, 5, 5000 * 0.12, { tempDelta: null });
  add("soiling", 8, 9, 2, 5000 * 0.07, { area: { block: 8, rowFrom: 8, rowTo: 11 } });
  add("soiling", 9, 10, 3, 5000 * 0.05, { area: { block: 9, rowFrom: 9, rowTo: 11 } });
  // Panel chains
  for (let i = 0; i < 13; i++) {
    add("string", Math.floor(rand() * 10), Math.floor(rand() * ROWS), Math.floor(rand() * COLS), 15.4, { tempDelta: Math.round(8 + rand() * 6), fixed: i !== 12 });
  }
  // Grass
  for (let i = 0; i < 5; i++) add("vegetation", 5 + Math.floor(rand() * 5), ROWS - 1, Math.floor(rand() * COLS), 2 + rand() * 3, { fixed: true });
  // Small panel defects
  for (let i = 0; i < 26; i++) {
    add("hotspot", Math.floor(rand() * 10), Math.floor(rand() * ROWS), Math.floor(rand() * COLS), 0.12 + rand() * 0.2, { tempDelta: Math.round(20 + rand() * 25), fixed: i < 18 });
  }
  for (let i = 0; i < 14; i++) {
    add("diode", Math.floor(rand() * 10), Math.floor(rand() * ROWS), Math.floor(rand() * COLS), 0.18, { tempDelta: Math.round(10 + rand() * 8), fixed: i < 9 });
  }
  return list;
}

const ALL_DEFECTS = buildDefects();

export function kztPerDay(lossKw) {
  return lossKw * KZT_PER_KW_DAY;
}

export const FLIGHTS = {
  "1": { id: "1", date: "14 October 2026", title: "Flight 1: before repairs" },
  "2": { id: "2", date: "21 October 2026", title: "Flight 2: after repairs" },
};

export function computeInspection(flight = "1") {
  const f = FLIGHTS[flight] ? flight : "1";
  const defects = (f === "1" ? ALL_DEFECTS : ALL_DEFECTS.filter((d) => !d.fixedOnFlight2))
    .map((d) => ({
      ...d,
      typeName: DEFECT_TYPES[d.type].name,
      short: DEFECT_TYPES[d.type].short,
      action: DEFECT_TYPES[d.type].action,
      crew: DEFECT_TYPES[d.type].crew,
      hours: DEFECT_TYPES[d.type].hours,
      kztDay: Math.round(kztPerDay(d.lossKw)),
    }))
    .sort((a, b) => b.lossKw - a.lossKw);

  const lossKw = defects.reduce((s, d) => s + d.lossKw, 0);
  const kztDay = kztPerDay(lossKw);
  const byType = {};
  for (const d of defects) {
    byType[d.type] ??= { type: d.type, name: d.short, count: 0, lossKw: 0 };
    byType[d.type].count++;
    byType[d.type].lossKw += d.lossKw;
  }
  const top3 = defects.slice(0, 3).reduce((s, d) => s + d.lossKw, 0);

  return {
    plant: { ...PLANT, blocks: PLANT.blocks.map((b) => ({ ...b, tables: tablesOf(b) })) },
    flight: FLIGHTS[f],
    econ: ECON,
    summary: {
      panels: PLANT.panels,
      defects: defects.length,
      lossKw: Math.round(lossKw),
      lossPct: Math.round((lossKw / PLANT.capacityKw) * 10000) / 100,
      kztDay: Math.round(kztDay),
      kztMonth: Math.round(kztDay * 30),
      kztYear: Math.round(kztDay * 365),
      top3SharePct: lossKw ? Math.round((top3 / lossKw) * 100) : 0,
      byType: Object.values(byType).sort((a, b) => b.lossKw - a.lossKw).map((t) => ({ ...t, lossKw: Math.round(t.lossKw * 10) / 10 })),
    },
    defects,
  };
}

function tablesOf(block) {
  const out = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) out.push(tablePos(block, r, c));
  return out;
}

// Kün payback for any plant: what it loses, what Kün brings back, what it costs
export function valueFor(mw, tariff = ECON.tariffKztPerKwh, lossPct = ECON.avgLossPct) {
  const revenue = mw * 1000 * ECON.yieldKwhPerKwYear * tariff;
  const lossNow = revenue * (lossPct / 100);
  const recoverable = revenue * (Math.max(lossPct - ECON.droneLossPct, 0) / 100);
  const price = mw * ECON.priceKztPerMwYear;
  return {
    mw,
    tariff,
    lossPct,
    revenueKztYear: Math.round(revenue),
    lossKztYear: Math.round(lossNow),
    recoverableKztYear: Math.round(recoverable),
    priceKztYear: Math.round(price),
    roi: price ? Math.round((recoverable / price) * 10) / 10 : 0,
  };
}

export function buildWorkOrder(flight = "1") {
  const st = computeInspection(flight);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const lines = [
    `WORK ORDER — ${st.plant.name}, ${st.plant.region}`,
    `${st.flight.title}, ${st.flight.date}`,
    `Panels checked: ${fmt(st.summary.panels)}. Defects found: ${st.summary.defects}.`,
    `The plant is losing ${fmt(st.summary.lossKw)} kW (${st.summary.lossPct}%), about ${fmt(st.summary.kztDay)} KZT every day.`,
    "",
    "Fix in this order: the most expensive problems first.",
    "",
  ];
  st.defects.forEach((d, i) => {
    lines.push(`${String(i + 1).padStart(2, " ")}. [${d.id}] ${d.typeName} — ${d.place}`);
    lines.push(`    Loss: ${d.lossKw} kW ≈ ${fmt(d.kztDay)} KZT/day. Who: ${d.crew}, about ${d.hours} h.`);
    lines.push(`    What to do: ${d.action}`);
  });
  lines.push("", "Demo data. Money: 1,400 kWh per kW per year (assumption) × 34.61 KZT/kWh (Government Decree No. 645).");
  return lines.join("\n");
}
