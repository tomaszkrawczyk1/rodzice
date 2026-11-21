import fs from "node:fs";
import path from "node:path";
import type { Parametry } from "@/engine/kalkulator";

export const dataDir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
let cache: { mtime: number; val: Parametry } | null = null;

export function getParametry(): Parametry {
  const f = path.join(dataDir(), "parametry.json");
  const st = fs.statSync(f);
  if (!cache || cache.mtime !== st.mtimeMs) cache = { mtime: st.mtimeMs, val: JSON.parse(fs.readFileSync(f, "utf8")) };
  return cache.val;
}

const WYMAGANE = ["kwoty", "procenty", "wymiary_tygodnie", "limity_dni", "terminy_dni", "platnik"];

export function saveParametry(obj: unknown) {
  if (!obj || typeof obj !== "object") throw new Error("Parametry muszą być obiektem JSON");
  for (const k of WYMAGANE) if (!(k in (obj as object))) throw new Error(`Brak sekcji „${k}”`);
  const f = path.join(dataDir(), "parametry.json");
  if (fs.existsSync(f)) fs.copyFileSync(f, f + ".bak");
  const tmp = f + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, f);
  cache = null;
}
