// Odczyt tekstu z dokumentu LOKALNIE: warstwa tekstowa PDF (mupdf, WASM) albo OCR (tesseract.js, WASM, język polski).
// Nic nie wychodzi poza serwer: bez zewnętrznych API, bez pakietów systemowych. Dane języka: public/ocr/pol.traineddata.gz.
import path from "node:path";
import * as mupdf from "mupdf";
import { createWorker, type Worker } from "tesseract.js";

export interface LiniaOcr { tekst: string; pewnosc: number }
export interface StronaOcr { nr: number; zrodlo: "warstwa_tekstowa" | "ocr"; linie: LiniaOcr[] }
export interface OdczytTekstu { stron: number; strony: StronaOcr[]; ostrzezenia: string[] }

export const MAKS_STRON = 40;
export const MAKS_BAJTOW = 25 * 1024 * 1024;
/** Poniżej tylu znaków warstwy tekstowej strona traktowana jest jak skan. */
const MIN_ZNAKOW_WARSTWY = 80;
/** Skala renderowania skanu: 2,1 ≈ 150 dpi, wystarcza dla druków ZUS i jest szybka. */
const SKALA = 2.1;

export type Format = { mime: "application/pdf" | "image/png" | "image/jpeg"; obraz: boolean };

/** Rozpoznaje typ po nagłówku pliku, nie po rozszerzeniu. */
export function rozpoznajFormat(b: Uint8Array): Format | null {
  if (b.length > 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return { mime: "application/pdf", obraz: false };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", obraz: true };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", obraz: true };
  return null;
}

let worker: Promise<Worker> | null = null;
function dajWorker() {
  worker ??= createWorker("pol", 1, { langPath: path.join(process.cwd(), "public", "ocr"), gzip: true, cacheMethod: "none" })
    .catch((e) => { worker = null; throw e; });
  return worker;
}
export async function zamknijOcr() { if (worker) { const w = await worker; worker = null; await w.terminate(); } }

function liniePrzezOcr(tekst: string, blocks: any[] | null | undefined): LiniaOcr[] {
  const z: LiniaOcr[] = [];
  for (const b of blocks ?? []) for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) {
    const t = String(l.text ?? "").replace(/\s+/g, " ").trim(); if (t) z.push({ tekst: t, pewnosc: Math.max(0, Math.min(1, (l.confidence ?? 0) / 100)) });
  }
  return z.length ? z : tekst.split("\n").map((t) => t.trim()).filter(Boolean).map((t) => ({ tekst: t, pewnosc: 0.5 }));
}

export async function odczytajTekst(bytes: Uint8Array, fmt: Format): Promise<OdczytTekstu> {
  const ostrzezenia: string[] = [];
  const doc = mupdf.Document.openDocument(bytes, fmt.mime);
  const stron = doc.countPages();
  const doOdczytu = Math.min(stron, MAKS_STRON);
  if (stron > MAKS_STRON) ostrzezenia.push(`Dokument ma ${stron} stron, odczytano pierwsze ${MAKS_STRON}.`);
  const strony: StronaOcr[] = [];
  for (let i = 0; i < doOdczytu; i++) {
    const page = doc.loadPage(i);
    try {
      if (!fmt.obraz) {
        const warstwa = page.toStructuredText("").asText();
        if (warstwa.replace(/\s/g, "").length >= MIN_ZNAKOW_WARSTWY) {
          strony.push({ nr: i + 1, zrodlo: "warstwa_tekstowa", linie: warstwa.split("\n").map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean).map((tekst) => ({ tekst, pewnosc: 0.98 })) });
          continue;
        }
      }
      const png = page.toPixmap(mupdf.Matrix.scale(SKALA, SKALA), mupdf.ColorSpace.DeviceGray, false, true).asPNG();
      const w = await dajWorker();
      const r = await w.recognize(Buffer.from(png), {}, { text: true, blocks: true });
      strony.push({ nr: i + 1, zrodlo: "ocr", linie: liniePrzezOcr(r.data.text ?? "", r.data.blocks) });
    } finally { page.destroy?.(); }
  }
  doc.destroy?.();
  return { stron, strony, ostrzezenia };
}
