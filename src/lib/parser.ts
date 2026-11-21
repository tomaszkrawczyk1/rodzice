import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { czat, jsonZOdpowiedzi, type Uzycie } from "./llm";

const run = promisify(execFile);

/** Czy strona jest pusta (skan bez treści)? Ułamek ciemnych pikseli w obrazie PGM. */
function ciemne(pgm: Buffer): number {
  let p = 0, nl = 0; while (nl < 3 && p < 40) if (pgm[p++] === 10) nl++;
  const dane = pgm.subarray(p); let c = 0; for (let i = 0; i < dane.length; i++) if (dane[i] < 140) c++;
  return c / Math.max(dane.length, 1);
}

export function peselOk(p?: string | null): boolean | null {
  if (!p) return null; if (!/^\d{11}$/.test(p)) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]; const s = w.reduce((a, x, i) => a + x * +p[i], 0);
  return (10 - (s % 10)) % 10 === +p[10];
}

export const PROMPT_KLASYFIKACJA = `Dostajesz miniatury kolejnych stron skanu sprawy w ZUS o zasiłek macierzyński. Dla każdej strony wskaż rodzaj dokumentu.
Odpowiedz WYŁĄCZNIE JSON-em: {"strony":[{"strona":<numer>,"rodzaj":"ZAM"|"Z-3"|"Z-3a"|"decyzja"|"odpis_aktu"|"inne"}]}
Reguły: ZAM = wniosek o zasiłek macierzyński (nagłówek ZAM); Z-3, Z-3a, Z-3b = zaświadczenie płatnika składek (rodzaj "Z-3" dla Z-3 i Z-3b); decyzja = decyzja/pismo ZUS z kwotami lub odmową; odpis_aktu = odpis aktu urodzenia/zgonu; inne = reszta (zrzuty ekranu, listy, załączniki). Strony kontynuujące dokument oznacz tak samo jak dokument.`;

export const PROMPT_EKSTRAKCJA = `Jesteś ekstraktorem danych z zeskanowanych druków ZUS (ZAM, Z-3, Z-3a, decyzje). Dostajesz kolejne strony jednej sprawy. Odczytaj pola do JSON-a.
ZASADY:
- Zwracaj WYŁĄCZNIE jeden obiekt JSON zgodny ze schematem. Pole, którego nie widać, jest nieczytelne albo zaczernione = null. NIGDY nie zgaduj i nie uzupełniaj z pamięci.
- NIE LICZ kwot ani podstaw – tylko przepisuj wartości z dokumentu. Liczby jako liczby (kropka dziesiętna, bez spacji i "zł"). Daty w formacie YYYY-MM-DD.
- Pomiń rachunki bankowe. Dane osobowe odczytuj tylko, gdy są czytelne.
- Tabela miesięcznych składników z Z-3/Z-3a: jeden wpis na wiersz (rok, miesiąc, dni przepracowane, dni obowiązany przepracować, składniki stałe, zmienne pomniejszone, premie faktyczne, procent składki; dla Z-3a w polu "stale" wpisz podstawę wymiaru składek na ubezpieczenie chorobowe z danego miesiąca).
- "pewnosc" to Twoja ocena 0–1, a "uwagi" lista krótkich zastrzeżeń (nieczytelne pola, sprzeczności).
SCHEMAT:
{"typ_dokumentu":"ZAM"|"Z-3"|"Z-3a"|"decyzja"|"mieszany",
"ubezpieczony":{"imie":str|null,"nazwisko":str|null,"pesel":str|null,"data_urodzenia":str|null},
"platnik":{"nazwa":str|null,"nip":str|null,"liczba_ubezpieczonych":"do_20"|"powyzej_20"|null},
"dzieci":[{"data_urodzenia":str|null,"za_zyciem":bool|null,"martwe":bool|null}],
"podstawa_wniosku":"porod"|"przysposobienie"|"rodzina_zastepcza"|"inna"|null,
"data_zdarzenia":str|null,
"wnioskowane_okresy":[{"rodzaj":"macierzynski"|"rodzicielski"|"ojcowski"|"uzupelniajacy"|"na_warunkach_macierzynskiego"|"chorobowy"|"inny","od":str|null,"do":str|null}],
"wariant_81_5":bool|null,"ubezpieczenie_chorobowe":bool|null,
"zatrudnienie":{"od":str|null,"do":str|null,"wymiar_etatu":number|null},
"skladniki_miesieczne":[{"rok":int,"miesiac":int,"dniPrzepracowal":number|null,"dniObowiazany":number|null,"stale":number|null,"zmiennePomniejszone":number|null,"premieFaktyczne":number|null,"procentSkladki":number|null}],
"decyzja":{"rodzaj":"przyznajaca"|"odmowna"|null,"podstawa_wymiaru":number|null,"procent":number|null,"kwota_lacznie":number|null,"okres_od":str|null,"okres_do":str|null,"uzasadnienie_odmowy":str|null},
"pewnosc":number,"uwagi":[str]}`;

export interface Wynik { strony: number; niepuste: number; uzyte: number[]; rodzaje: Record<string, string>; dane: any; ostrzezenia: string[]; uzycie: Uzycie }

async function render(pdf: string, dpi: number, fmt: "pgm" | "jpeg", dir: string, prefix: string) {
  const args = fmt === "pgm" ? ["-r", String(dpi), "-gray", pdf, path.join(dir, prefix)] : ["-r", String(dpi), "-jpeg", "-jpegopt", "quality=62", pdf, path.join(dir, prefix)];
  await run("pdftoppm", args, { maxBuffer: 1 << 26, timeout: 120_000 });
  return (await readdir(dir)).filter((f) => f.startsWith(prefix + "-")).sort();
}
const nr = (f: string) => parseInt(f.match(/-(\d+)\.\w+$/)![1], 10);

export async function parsuj(bytes: Buffer, nazwa: string): Promise<Wynik> {
  const dir = await mkdtemp(path.join(tmpdir(), "rodzice-"));
  const uzycie: Uzycie = { zapytania: 0, tokeny: 0 }; const ostrz: string[] = [];
  try {
    const pdf = path.join(dir, "w.pdf");
    if (/\.(png|jpe?g)$/i.test(nazwa)) { // pojedynczy obraz -> PDF nie jest potrzebny, wysyłamy bez klasyfikacji
      const b64 = bytes.toString("base64"); const mime = /png$/i.test(nazwa) ? "image/png" : "image/jpeg";
      const odp = await czat([{ role: "system", content: PROMPT_EKSTRAKCJA }, { role: "user", content: [{ type: "text", text: "Strona 1" }, { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } }] }], { uzycie, maxTokens: 6000 });
      return zbierz(jsonZOdpowiedzi(odp), 1, 1, [1], {}, ostrz, uzycie);
    }
    await writeFile(pdf, bytes);
    const maleP = await render(pdf, 40, "pgm", dir, "t");
    const niepuste: number[] = [];
    for (const f of maleP) if (ciemne(await readFile(path.join(dir, f))) > 0.006) niepuste.push(nr(f));
    if (!niepuste.length) throw new Error("Dokument nie zawiera czytelnych stron.");

    let wybrane = niepuste; let rodzaje: Record<string, string> = {};
    if (niepuste.length > 8) {
      const mini = await render(pdf, 42, "jpeg", dir, "m");
      const cz: any[] = [{ type: "text", text: "Miniatury stron:" }];
      for (const f of mini) { const n = nr(f); if (!niepuste.includes(n) || cz.length > 90) continue; cz.push({ type: "text", text: `Strona ${n}:` }, { type: "image_url", image_url: { url: "data:image/jpeg;base64," + (await readFile(path.join(dir, f))).toString("base64") } }); }
      try {
        const k = jsonZOdpowiedzi(await czat([{ role: "system", content: PROMPT_KLASYFIKACJA }, { role: "user", content: cz }], { uzycie, maxTokens: 2500 }));
        for (const s of k.strony ?? []) rodzaje[String(s.strona)] = s.rodzaj;
        const wazne = niepuste.filter((n) => ["ZAM", "Z-3", "Z-3a", "decyzja"].includes(rodzaje[String(n)]));
        if (wazne.length) wybrane = wazne; else { ostrz.push("Nie rozpoznano stron formularzy – odczytano pierwsze strony dokumentu."); wybrane = niepuste.slice(0, 12); }
      } catch (e: any) { ostrz.push("Klasyfikacja stron nie powiodła się – odczytano pierwsze strony. " + e.message); wybrane = niepuste.slice(0, 12); }
    }
    const MAX = 14; if (wybrane.length > MAX) { ostrz.push(`Dokument ma ${wybrane.length} istotnych stron – odczytano pierwsze ${MAX}.`); wybrane = wybrane.slice(0, MAX); }
    const duze = await render(pdf, 105, "jpeg", dir, "d");
    const tresc: any[] = [{ type: "text", text: "Strony sprawy:" }];
    for (const f of duze) { const n = nr(f); if (!wybrane.includes(n)) continue; tresc.push({ type: "text", text: `Strona ${n}${rodzaje[String(n)] ? ` (${rodzaje[String(n)]})` : ""}:` }, { type: "image_url", image_url: { url: "data:image/jpeg;base64," + (await readFile(path.join(dir, f))).toString("base64") } }); }
    const odp = await czat([{ role: "system", content: PROMPT_EKSTRAKCJA }, { role: "user", content: tresc }], { uzycie, maxTokens: 7000 });
    return zbierz(jsonZOdpowiedzi(odp), maleP.length, niepuste.length, wybrane, rodzaje, ostrz, uzycie);
  } finally { await rm(dir, { recursive: true, force: true }); }
}

/** Walidacja deterministyczna (kod, nie AI). */
function zbierz(d: any, strony: number, niepuste: number, uzyte: number[], rodzaje: Record<string, string>, ostrz: string[], uzycie: Uzycie): Wynik {
  const ok = peselOk(d?.ubezpieczony?.pesel);
  if (ok === false) ostrz.push("PESEL ma niepoprawną sumę kontrolną – sprawdź odczyt.");
  for (const o of d?.wnioskowane_okresy ?? []) if (o.od && o.do && o.od > o.do) ostrz.push(`Okres ${o.rodzaj}: data początku jest po dacie końca.`);
  const m = d?.skladniki_miesieczne ?? []; if (m.length && m.length < 12) ostrz.push(`Odczytano ${m.length} z 12 miesięcy wynagrodzeń – uzupełnij brakujące lub potwierdź.`);
  for (const w of m) if (w.dniPrzepracowal != null && w.dniObowiazany != null && w.dniPrzepracowal > w.dniObowiazany) ostrz.push(`Miesiąc ${w.rok}-${w.miesiac}: dni przepracowane > dni obowiązkowe.`);
  if ((d?.pewnosc ?? 1) < 0.6) ostrz.push("Niska pewność odczytu – zweryfikuj dane ręcznie.");
  if (d && typeof d === "object") d._pesel_poprawny = ok;
  return { strony, niepuste, uzyte, rodzaje, dane: d, ostrzezenia: ostrz, uzycie };
}
