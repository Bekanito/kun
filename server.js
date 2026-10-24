// Локальный сервер без зависимостей: node server.js → http://localhost:3000
// На Vercel этот файл не нужен: там папка api/ работает как серверные функции.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import inspection from "./api/inspection.js";
import value from "./api/value.js";
import workorder from "./api/workorder.js";

const root = fileURLToPath(new URL("./public/", import.meta.url));
const routes = { "/api/inspection": inspection, "/api/value": value, "/api/workorder": workorder };
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

// Добавляем к ответу методы status/json/send, как в серверных функциях Vercel
function wrap(res) {
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (obj) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
  };
  res.send = (body) => res.end(body);
  return res;
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const handler = routes[url.pathname];
    if (handler) {
      req.query = Object.fromEntries(url.searchParams);
      return handler(req, wrap(res));
    }
    const path = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
    try {
      const body = await readFile(join(root, path));
      res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Не найдено");
    }
  })
  .listen(process.env.PORT || 3000, () => console.log(`Kün: http://localhost:${process.env.PORT || 3000}`));
