// Kontrola poradnika: czy każda liczba w odpowiedzi/krokach/uwagach występuje w cytowanych źródłach (JSON/Excel)
// oraz czy drzewko decyzyjne jest spójne. Uruchom: node weryfikuj_poradnik.ts
// Ograniczenie: sprawdza LICZBY i odwołania, nie sens zdań. Treść nadal trzeba przeczytać człowiekiem.
import { readFileSync } from "node:fs";

const rd = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const baza = rd("../../../data/baza_regul.json").tematy;
const excel = rd("_excel_tekst.json").wiersze;
const faq = rd("faq.json");
const druki = rd("druki.json");
const drzewo = rd("drzewo_decyzyjne.json");

// indeks elementów JSON po id
const jsonById: Record<string, string> = {};
for (const t of Object.values<any>(baza)) for (const k of ["reguly", "tabele", "formuly"]) for (const r of t[k] ?? []) jsonById[r.id] = JSON.stringify(r);

const nums = (s: string) => new Set((s.replace(/\b(?:ZAS-\d+|Z-3a?|ZAS)\b/g, " ").match(/\d+(?:[.,]\d+)?/g) ?? []).map(x => x.replace(/^0+(?=\d)/, "")));
const tekstZrodel = (zr: any[]) => {
  let t = ""; const brak: string[] = [];
  for (const z of zr) {
    if (z.typ === "json") { if (jsonById[z.id]) t += " " + jsonById[z.id]; else brak.push(`JSON ${z.id}`); }
    else if (z.typ === "excel") { const w = excel[z.wiersz]; if (!w) { brak.push(`Excel wiersz ${z.wiersz}`); continue; } for (const k of z.kol) { if (w[k] !== undefined) t += " " + w[k]; else brak.push(`Excel ${k}${z.wiersz}`); } }
    // typ "zadanie": nie weryfikujemy liczb (inny dokument)
  }
  return { t, brak };
};

let bledy = 0, ostrz = 0;
const err = (m: string) => { bledy++; console.log("BŁĄD   " + m); };
const warn = (m: string) => { ostrz++; console.log("UWAGA  " + m); };

function sprawdzWpis(id: string, pola: Record<string, string | string[] | undefined>, zr: any[]) {
  const { t, brak } = tekstZrodel(zr);
  for (const b of brak) err(`${id}: brak źródła ${b}`);
  if (!zr.length) { err(`${id}: brak zrodla[]`); return; }
  if (zr.every(z => z.typ === "zadanie")) { warn(`${id}: źródło tylko z treści zadania – liczb nie weryfikuję`); return; }
  const zn = nums(t);
  for (const [pole, v] of Object.entries(pola)) {
    const teksty = Array.isArray(v) ? v : v ? [v] : [];
    for (const s of teksty) for (const n of nums(s)) if (!zn.has(n)) err(`${id}.${pole}: liczba „${n}” nie występuje w cytowanych źródłach → „${s.slice(0, 90)}…”`);
  }
}

// ---- FAQ ----
const ids = new Set<string>();
for (const q of faq.pytania) {
  if (ids.has(q.id)) err(`duplikat id ${q.id}`); ids.add(q.id);
  sprawdzWpis(q.id, { odpowiedz: q.odpowiedz, kroki: q.kroki, uwaga: q.uwaga }, q.zrodla ?? []);
  for (const d of q.druki ?? []) if (!druki.druki.some((x: any) => x.id === d)) err(`${q.id}: nieznany druk ${d}`);
  for (const p of q.powiazane ?? []) if (!faq.pytania.some((x: any) => x.id === p)) err(`${q.id}: powiązane ${p} nie istnieje`);
  if (!["ok", "luka", "do_potwierdzenia"].includes(q.status)) err(`${q.id}: zły status`);
}
// ---- druki ----
const DOZW = new Set(["ZAM", "Z-3", "Z-3a", "ZAS-12", "ZAS-26", "ZAS-53"]);
for (const d of druki.druki) {
  if (!DOZW.has(d.id)) err(`druk ${d.id} spoza listy dozwolonych (ZAM, Z-3, Z-3a, ZAS-12, ZAS-26, ZAS-53)`);
  sprawdzWpis("druk " + d.id, { tutorial: d.tutorial, terminy: d.terminy, uwagi: d.uwagi, do_czego: d.do_czego, gdzie: d.gdzie }, d.zrodla ?? []);
}
for (const x of DOZW) if (!druki.druki.some((d: any) => d.id === x)) err(`brak opisu druku ${x}`);

// ---- drzewko ----
const W = drzewo.wezly;
const dostepne = new Set<string>(); const kolejka = [drzewo.start];
while (kolejka.length) { const n = kolejka.pop()!; if (dostepne.has(n)) continue; dostepne.add(n); const w = W[n]; if (!w) { err(`drzewo: brak węzła ${n}`); continue; } for (const o of w.opcje ?? []) kolejka.push(o.nastepny); }
for (const n of Object.keys(W)) if (!dostepne.has(n)) warn(`drzewo: węzeł ${n} jest nieosiągalny`);
for (const [n, w] of Object.entries<any>(W)) {
  if (w.typ === "pytanie" && (!w.opcje || w.opcje.length < 2)) err(`drzewo: ${n} ma <2 opcje`);
  if (w.typ === "wynik") {
    const unia = new Set<string>();
    for (const p of w.pytania ?? []) { const q = faq.pytania.find((x: any) => x.id === p); if (!q) err(`drzewo ${n}: pytanie ${p} nie istnieje`); else for (const d of q.druki ?? []) unia.add(d); }
    for (const d of w.druki ?? []) if (!DOZW.has(d)) err(`drzewo ${n}: druk ${d} niedozwolony`); else if (!unia.has(d)) warn(`drzewo ${n}: druk ${d} nie występuje w żadnym z jego pytań`);
    const luki = (w.pytania ?? []).map((p: string) => faq.pytania.find((x: any) => x.id === p)?.status);
    if (luki.includes("luka") && w.status !== "luka") warn(`drzewo ${n}: odwołuje się do luki, a węzeł nie ma status:"luka"`);
  }
}
console.log(`\nSprawdzono: ${faq.pytania.length} pytań, ${druki.druki.length} druków, ${Object.keys(W).length} węzłów drzewa.`);
console.log(`WYNIK: ${bledy} błędów, ${ostrz} uwag`);
process.exit(bledy ? 1 : 0);
