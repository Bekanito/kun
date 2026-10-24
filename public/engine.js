// Kün — логика платформы. Один файл для сервера (api/*.js) и браузера (запасной режим).
// Схема станции и облёты — демо-данные. Экономика — с источниками или пометкой «допущение».

export const ECON = {
  // Фиксированный тариф для солнечных станций: 34,61 ₸/кВт·ч без НДС (ПП РК № 645 от 12.06.2014)
  tariffKztPerKwh: 34.61,
  // Годовая выработка 1 кВт панелей на юге Казахстана: допущение
  yieldKwhPerKwYear: 1400,
  // Средняя потеря мощности из-за дефектов: 5,08% (Raptor Maps, Global Solar Report 2026, 373 ГВт)
  avgLossPct: 5.08,
  // На станциях с регулярными облётами дронов потеря около 3% (там же)
  droneLossPct: 3.0,
  // Цена Kün: 300 000 ₸ за 1 МВт в год — наше предположение
  priceKztPerMwYear: 300000,
};

const DAY_KWH_PER_KW = ECON.yieldKwhPerKwYear / 365;
const KZT_PER_KW_DAY = DAY_KWH_PER_KW * ECON.tariffKztPerKwh; // ≈ 132,8 ₸ в сутки за 1 кВт

export const PLANT = {
  id: "demo-kun",
  name: "СЭС «Демо-Күн»",
  region: "Жамбылская область (условно)",
  capacityKw: 50000,
  panels: 90720,
  blocks: [], // заполняется ниже
};

// 10 блоков по 5 МВт: 2 ряда × 5. В каждом блоке 12 рядов × 6 столов. Стол ≈ 69,4 кВт (126 панелей).
const BLOCK_W = 180, BLOCK_H = 262, GAP_X = 12, GAP_Y = 34, X0 = 26, Y0 = 44;
const ROWS = 12, COLS = 6, TABLE_KW = PLANT.capacityKw / (10 * ROWS * COLS);
for (let i = 0; i < 10; i++) {
  const r = Math.floor(i / 5), c = i % 5;
  PLANT.blocks.push({
    id: `Б-${i + 1}`,
    inverter: `ИНВ-${i + 1}`,
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
  combiner: { name: "Отказ комбайнер-бокса", short: "Комбайнер", action: "Заменить предохранители и проверить комбайнер-бокс", crew: "Электрик", hours: 3 },
  string: { name: "Отключена цепочка панелей", short: "Цепочка", action: "Проверить разъёмы MC4 и предохранитель цепочки", crew: "Электрик", hours: 1 },
  inverter: { name: "Инвертор недодаёт мощность", short: "Инвертор", action: "Сервис инвертора: фильтры, вентиляция, ошибки в журнале", crew: "Сервис производителя", hours: 4 },
  soiling: { name: "Пыль на панелях", short: "Пыль", action: "Помыть панели в зоне у дороги", crew: "Мойка", hours: 6 },
  hotspot: { name: "Горячая точка в панели", short: "Горячая точка", action: "Заменить панель по гарантии производителя", crew: "Монтажник", hours: 0.5 },
  diode: { name: "Пробит байпас-диод", short: "Диод", action: "Заменить панель по гарантии производителя", crew: "Монтажник", hours: 0.5 },
  vegetation: { name: "Затенение травой", short: "Трава", action: "Скосить траву перед рядом", crew: "Подсобный рабочий", hours: 1 },
};

// Детерминированный генератор: одинаковые данные на любом сервере и в браузере
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
  if (type === "inverter") return `блок ${block.id}, инвертор ${block.inverter}`;
  if (type === "soiling" && area) return `блок ${block.id}, ряды ${area.rowFrom + 1}–${area.rowTo + 1}`;
  if (type === "combiner") return `блок ${block.id}, ряд ${row + 1} целиком`;
  return `блок ${block.id}, ряд ${row + 1}, стол ${col + 1}`;
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
  // Крупные: то, что съедает больше всего денег
  add("combiner", 2, 4, 0, TABLE_KW * COLS, { tempDelta: 18, area: { block: 2, rowFrom: 4, rowTo: 4 } });
  add("combiner", 5, 9, 0, TABLE_KW * COLS, { tempDelta: 16, area: { block: 5, rowFrom: 9, rowTo: 9 } });
  add("inverter", 6, 11, 5, 5000 * 0.12, { tempDelta: null });
  add("soiling", 8, 9, 2, 5000 * 0.07, { area: { block: 8, rowFrom: 8, rowTo: 11 } });
  add("soiling", 9, 10, 3, 5000 * 0.05, { area: { block: 9, rowFrom: 9, rowTo: 11 } });
  // Цепочки
  for (let i = 0; i < 13; i++) {
    add("string", Math.floor(rand() * 10), Math.floor(rand() * ROWS), Math.floor(rand() * COLS), 15.4, { tempDelta: Math.round(8 + rand() * 6), fixed: i !== 12 });
  }
  // Трава
  for (let i = 0; i < 5; i++) add("vegetation", 5 + Math.floor(rand() * 5), ROWS - 1, Math.floor(rand() * COLS), 2 + rand() * 3, { fixed: true });
  // Мелкие дефекты панелей
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
  "1": { id: "1", date: "14 октября 2026", title: "Облёт 1: до ремонта" },
  "2": { id: "2", date: "21 октября 2026", title: "Облёт 2: после ремонта" },
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

// Окупаемость Kün для любой станции: что теряет, что вернёт, сколько стоит
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
  const fmt = (n) => Math.round(n).toLocaleString("ru-RU");
  const lines = [
    `НАРЯД-ЗАДАНИЕ — ${st.plant.name}, ${st.plant.region}`,
    `${st.flight.title}, ${st.flight.date}`,
    `Проверено панелей: ${fmt(st.summary.panels)}. Дефектов: ${st.summary.defects}.`,
    `Станция теряет ${fmt(st.summary.lossKw)} кВт (${String(st.summary.lossPct).replace(".", ",")}%), это ≈ ${fmt(st.summary.kztDay)} ₸ в день.`,
    "",
    "Порядок работ: сначала то, что дороже всего стоит каждый день.",
    "",
  ];
  st.defects.forEach((d, i) => {
    lines.push(`${String(i + 1).padStart(2, " ")}. [${d.id}] ${d.typeName} — ${d.place}`);
    lines.push(`    Потеря: ${String(d.lossKw).replace(".", ",")} кВт ≈ ${fmt(d.kztDay)} ₸/день. Кто: ${d.crew}, ≈ ${d.hours} ч.`);
    lines.push(`    Что сделать: ${d.action}`);
  });
  lines.push("", "Демо-данные. Пересчёт в тенге: 1 400 кВт·ч на 1 кВт в год (допущение) × 34,61 ₸/кВт·ч (ПП РК № 645).");
  return lines.join("\n");
}
