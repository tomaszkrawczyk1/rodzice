// Odczyt pól z tekstu druków ZUS (Z-3, Z-3a, ZAM) bez AI: wyrażenia regularne + walidacja (PESEL, daty, kwoty, dni).
// Każde pole ma pewność 0–1 (z pewności OCR i z tego, czy przeszło walidację). Kwoty liczy silnik, nie parser.
import { podstawaPracownik, wierszZ3NaMiesiac, podstawaNiepracownik } from "@/engine/kalkulator";
import { getParametry } from "@/lib/params";
import type { StronaOcr } from "@/lib/ocr";

export type TypDokumentu = "ZAM" | "Z-3" | "Z-3a" | "mieszany" | null;
export interface WierszMiesiaca { rok: number; miesiac: number; dniPrzepracowal: number | null; dniObowiazany: number | null; stale: number | null; zmiennePomniejszone: number | null; premieFaktyczne: number | null; procentSkladki: number | null; pewnosc: number }
export interface Okres { rodzaj: string; od: string | null; do: string | null; pewnosc: number }
export interface DaneOdczytane {
  typ_dokumentu: TypDokumentu;
  ubezpieczony: { imie: string | null; nazwisko: string | null; pesel: string | null };
  platnik: { nazwa: string | null; nip: string | null; liczba_ubezpieczonych: "do_20" | "powyzej_20" | null };
  podstawa_wniosku: "porod" | "przysposobienie" | "rodzina_zastepcza" | null;
  data_zdarzenia: string | null;
  dzieci: unknown[];
  wnioskowane_okresy: Okres[];
  wariant_81_5: boolean | null;
  zatrudnienie: { wymiar_etatu: number | null };
  skladniki_miesieczne: WierszMiesiaca[];
}
/** Pewność odczytu pól pojedynczych (0–1); null = nie znaleziono. */
export type PewnoscPol = Record<"typ" | "pesel" | "osoba" | "platnik" | "liczba_ubezpieczonych" | "data_zdarzenia" | "wymiar_etatu" | "wariant_81_5", number | null>;
export interface Wynik { strony: number; zrodla: string[]; dane: DaneOdczytane; pewnosc: PewnoscPol; ostrzezenia: string[] }

export function peselOk(p?: string | null): boolean | null {
  if (!p) return null; if (!/^\d{11}$/.test(p)) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]; const s = w.reduce((a, x, i) => a + x * +p[i], 0);
  return (10 - (s % 10)) % 10 === +p[10];
}

const dwie = (n: number) => String(n).padStart(2, "0");
/** Data z tekstu (RRRR-MM-DD albo DD.MM.RRRR) -> ISO; null gdy nie jest prawdziwą datą z lat 1990–2100. */
export function dataIso(s: string): string | null {
  const m = s.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/) ?? null;
  let r: number, mm: number, d: number;
  if (m) { r = +m[1]; mm = +m[2]; d = +m[3]; }
  else { const k = s.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{4})/); if (!k) return null; d = +k[1]; mm = +k[2]; r = +k[3]; }
  if (r < 1990 || r > 2100 || mm < 1 || mm > 12 || d < 1) return null;
  const t = new Date(Date.UTC(r, mm - 1, d)); if (t.getUTCMonth() !== mm - 1) return null;
  return `${r}-${dwie(mm)}-${dwie(d)}`;
}
const DATA_RE = String.raw`(?:\d{4}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,2}|\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{4})`;

/** Kwota "6500.00", "6 500,00" -> liczba; null gdy to nie kwota z dwoma miejscami po przecinku. */
export function kwota(s: string): number | null {
  const t = s.replace(/\s/g, "").replace(",", "."); return /^\d+\.\d{2}$/.test(t) ? +t : null;
}

function rodzajOkresu(t: string): string {
  const s = t.toLowerCase();
  if (/uzupe[łl]niaj/.test(s)) return "uzupelniajacy";
  if (/rodzicielsk/.test(s)) return "rodzicielski";
  if (/ojcowsk/.test(s)) return "ojcowski";
  if (/na warunkach/.test(s)) return "na_warunkach_macierzynskiego";
  if (/macierzy[nń]sk/.test(s)) return "macierzynski";
  if (/chorobow/.test(s)) return "chorobowy";
  return "inny";
}

function typStrony(tekst: string): "Z-3" | "Z-3a" | "ZAM" | null {
  if (/\bZ[-–—]?\s?3\s?a\b/i.test(tekst) || /informacje o przychodzie|podstawa wymiaru sk[łl]adek/i.test(tekst)) return "Z-3a";
  if (/\bZ[-–—]\s?3\b/i.test(tekst) || /za[śs]wiadczenie\s+p[łl]atnika|sk[łl]adniki wynagrodzenia/i.test(tekst)) return "Z-3";
  if (/^\s*ZAM\b/m.test(tekst) || /wnioskuj\p{L}*\s+w\s+zwi[ąa]zku\s+z/iu.test(tekst) || /^\s*wniosek o zasi[łl]ek macierzy[nń]ski\s*$/im.test(tekst)) return "ZAM";
  return null;
}

/** Wiersz tabeli składników: rok, miesiąc, potem same liczby (dni, kwoty, procent). Zwraca null, gdy to nie wiersz tabeli. */
function wierszTabeli(t: string, pewnoscLinii: number, jakoZ3a: boolean): WierszMiesiaca | null {
  const m = t.match(/^\D{0,3}(20\d{2})\s+(1[0-2]|0?[1-9])[.,;:|]?\s+(.+)$/); if (!m) return null;
  const liczby = m[3].replace(/[|]/g, " ").replace(/(\d)\s+(\d{3}[.,]\d{2})\b/g, "$1$2").split(/\s+/).map((x) => x.replace(/[^\d.,]/g, "")).filter(Boolean);
  if (liczby.length < 3) return null;
  const cale = (s: string) => (/^\d{1,2}$/.test(s) ? +s : null);
  const dP = cale(liczby[0]), dO = cale(liczby[1]);
  if (dP == null || dO == null || dO > 31 || dP > dO) return null;
  const kw = liczby.slice(2).map(kwota);
  if (kw[0] == null) return null;
  const r: WierszMiesiaca = { rok: +m[1], miesiac: +m[2], dniPrzepracowal: dP, dniObowiazany: dO, stale: kw[0], zmiennePomniejszone: null, premieFaktyczne: null, procentSkladki: null, pewnosc: pewnoscLinii };
  if (!jakoZ3a) {
    r.zmiennePomniejszone = kw[1] ?? null; r.premieFaktyczne = kw[2] ?? null;
    const proc = liczby[5]?.replace(",", "."); r.procentSkladki = proc && /^\d{1,2}(\.\d+)?$/.test(proc) && +proc <= 25 ? +proc : null;
    if (r.zmiennePomniejszone == null || r.premieFaktyczne == null) r.pewnosc = Math.min(r.pewnosc, 0.5);
  }
  return r;
}

export function parsujTekst(strony: StronaOcr[]): Wynik {
  const ostrz: string[] = [];
  const linie = strony.flatMap((s) => s.linie.map((l) => ({ ...l, str: s.nr })));
  const typy = new Set(strony.map((s) => typStrony(s.linie.map((l) => l.tekst).join("\n"))).filter(Boolean));
  const pewnosc: PewnoscPol = { typ: null, pesel: null, osoba: null, platnik: null, liczba_ubezpieczonych: null, data_zdarzenia: null, wymiar_etatu: null, wariant_81_5: null };
  const dane: DaneOdczytane = {
    typ_dokumentu: typy.size > 1 ? "mieszany" : ((([...typy][0]) as TypDokumentu) ?? null),
    ubezpieczony: { imie: null, nazwisko: null, pesel: null }, platnik: { nazwa: null, nip: null, liczba_ubezpieczonych: null },
    podstawa_wniosku: null, data_zdarzenia: null, dzieci: [], wnioskowane_okresy: [], wariant_81_5: null, zatrudnienie: { wymiar_etatu: null }, skladniki_miesieczne: [],
  };
  if (dane.typ_dokumentu) pewnosc.typ = 0.9;

  // PESEL: najpierw po etykiecie, potem każdy poprawny z sumą kontrolną
  const kandydaci: { p: string; poEtykiecie: boolean; pw: number }[] = [];
  for (const l of linie) {
    const poEtykiecie = /pesel/i.test(l.tekst);
    for (const m of l.tekst.matchAll(/(?<!\d)(\d{11})(?!\d)/g)) kandydaci.push({ p: m[1], poEtykiecie, pw: l.pewnosc });
    // druki mają PESEL w kratkach: OCR zwraca cyfry rozdzielone spacjami
    if (poEtykiecie) for (const m of l.tekst.matchAll(/(?<![\d])(?:\d[ .-]){10}\d(?!\d)/g)) kandydaci.push({ p: m[0].replace(/\D/g, ""), poEtykiecie, pw: Math.min(l.pewnosc, 0.8) });
  }
  const wybrany = kandydaci.find((k) => k.poEtykiecie && peselOk(k.p)) ?? kandydaci.find((k) => peselOk(k.p)) ?? kandydaci.find((k) => k.poEtykiecie);
  if (wybrany) {
    dane.ubezpieczony.pesel = wybrany.p;
    const ok = peselOk(wybrany.p);
    pewnosc.pesel = ok ? Math.min(0.97, wybrany.pw + 0.05) : Math.min(0.5, wybrany.pw);
    if (!ok) ostrz.push("PESEL ma niepoprawną sumę kontrolną – sprawdź odczyt.");
  } else ostrz.push("Nie znaleziono numeru PESEL – wpisz go ręcznie.");

  // imię i nazwisko
  for (const l of linie) {
    const m = l.tekst.match(/^(?:ubezpieczon\w*|imi[ęe] i nazwisko|pracownik\w*)\s*:?\s*([A-ZĄĆĘŁŃÓŚŹŻ][\p{L}-]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][\p{L}-]+){1,2})\s*$/iu);
    if (m) { const [imie, ...r] = m[1].split(/\s+/); dane.ubezpieczony.imie = imie; dane.ubezpieczony.nazwisko = r.join(" "); pewnosc.osoba = l.pewnosc; break; }
  }

  // płatnik
  for (const l of linie) {
    const m = l.tekst.match(/^p[łl]atnik\w*(?:\s+sk[łl]adek)?\s*:?\s*(.+)$/i); if (!m) continue;
    const nip = m[1].match(/NIP\s*:?\s*([\d-]{10,13})/i);
    dane.platnik.nazwa = m[1].replace(/,?\s*NIP.*$/i, "").trim() || null; if (nip) dane.platnik.nip = nip[1].replace(/-/g, "");
    pewnosc.platnik = l.pewnosc; break;
  }
  for (const l of linie) {
    if (!/ubezpieczon\w*\s+u\s+p[łl]atnika|liczba\s+ubezpieczonych/i.test(l.tekst)) continue;
    if (/powy[żz]ej\s*20/i.test(l.tekst)) { dane.platnik.liczba_ubezpieczonych = "powyzej_20"; pewnosc.liczba_ubezpieczonych = l.pewnosc; }
    else if (/do\s*20\b/i.test(l.tekst)) { dane.platnik.liczba_ubezpieczonych = "do_20"; pewnosc.liczba_ubezpieczonych = l.pewnosc; }
    if (pewnosc.liczba_ubezpieczonych != null) break;
  }

  // okresy "od DATA do DATA" z rodzajem z tej linii albo z poprzedniej
  for (let i = 0; i < linie.length; i++) {
    const m = linie[i].tekst.match(new RegExp(String.raw`\bod\s*(${DATA_RE})\s*(?:do|-|–)\s*(${DATA_RE})`, "i"));
    const m2 = m ?? linie[i].tekst.match(new RegExp(String.raw`\bod\s*(\S{0,12}?)\s+do\s*(${DATA_RE})`, "i"));
    if (!m2) continue;
    const kontekst = `${linie[i].tekst} ${linie[i - 1]?.tekst ?? ""}`;
    if (!/zasi[łl]ek|urlop|okres|wniosek/i.test(kontekst)) continue;
    const od = dataIso(m2[1]), do_ = dataIso(m2[2]);
    const rodzaj = rodzajOkresu(linie[i].tekst) !== "inny" ? rodzajOkresu(linie[i].tekst) : rodzajOkresu(linie[i - 1]?.tekst ?? "");
    dane.wnioskowane_okresy.push({ rodzaj, od, do: do_, pewnosc: od && do_ ? linie[i].pewnosc : Math.min(0.3, linie[i].pewnosc) });
    if (!od || !do_) ostrz.push("Nie udało się odczytać daty początku lub końca okresu – uzupełnij ją.");
  }
  for (const o of dane.wnioskowane_okresy) if (o.od && o.do && o.od > o.do) ostrz.push("Data początku okresu jest po dacie końca – sprawdź odczyt.");

  // data zdarzenia: poród / przyjęcie dziecka; awaryjnie początek urlopu macierzyńskiego
  for (const l of linie) {
    const m = l.tekst.match(new RegExp(String.raw`(?:data\s+(?:porodu|urodzenia(?:\s+dziecka)?|przyj[ęe]cia(?:\s+dziecka)?)|termin porodu)\s*:?\s*(${DATA_RE})`, "i"));
    const d = m && dataIso(m[1]); if (d) { dane.data_zdarzenia = d; pewnosc.data_zdarzenia = l.pewnosc; break; }
  }
  if (!dane.data_zdarzenia) {
    const mac = dane.wnioskowane_okresy.find((o) => o.rodzaj === "macierzynski" && o.od);
    if (mac) { dane.data_zdarzenia = mac.od; pewnosc.data_zdarzenia = Math.min(0.4, mac.pewnosc); ostrz.push("Nie znaleziono daty porodu. Przyjęto początek urlopu macierzyńskiego – sprawdź."); }
  }
  const zw = linie.find((l) => /wnioskuj\p{L}*\s+w\s+zwi[ąa]zku\s+z/iu.test(l.tekst));
  if (zw) dane.podstawa_wniosku = /przyj[ęe]ci|przysposob/i.test(zw.tekst) ? (/zast[ęe]pcz/i.test(zw.tekst) ? "rodzina_zastepcza" : "przysposobienie") : /urodzeni|poród|porod/i.test(zw.tekst) ? "porod" : null;

  // wymiar etatu
  const lw = linie.find((l) => /wymiar\w*\s+czasu\s+pracy|wymiar\w*\s+etatu/i.test(l.tekst));
  if (lw) {
    const u = lw.tekst.match(/(?<!\d)(\d{1,2})\s*\/\s*(\d{1,2})(?!\d)/);
    if (u && +u[2] > 0 && +u[1] <= +u[2]) { dane.zatrudnienie.wymiar_etatu = +u[1] / +u[2]; pewnosc.wymiar_etatu = lw.pewnosc; }
    else if (/pe[łl]n\w*\s+etat|pe[łl]ny\s+wymiar/i.test(lw.tekst)) { dane.zatrudnienie.wymiar_etatu = 1; pewnosc.wymiar_etatu = lw.pewnosc; }
  }

  // wariant 81,5 % (pole wyboru z OCR bywa niepewne, więc pewność zaniżona)
  const lv = linie.find((l) => /81[.,]\s?5/.test(l.tekst) || /pe[łl]nego wymiaru urlopu/i.test(l.tekst));
  if (lv) { dane.wariant_81_5 = /\bnie\s+zamierzam/i.test(lv.tekst) ? false : /zamierzam/i.test(lv.tekst) ? true : null; if (dane.wariant_81_5 != null) pewnosc.wariant_81_5 = Math.min(0.5, lv.pewnosc); }

  // tabela składników (Z-3: kwoty ze składnikami; Z-3a: podstawa wymiaru składek)
  const jakoZ3a = dane.typ_dokumentu === "Z-3a";
  const wiersze = new Map<string, WierszMiesiaca>();
  for (const l of linie) { const w = wierszTabeli(l.tekst, l.pewnosc, jakoZ3a); if (w && !wiersze.has(`${w.rok}-${w.miesiac}`)) wiersze.set(`${w.rok}-${w.miesiac}`, w); }
  dane.skladniki_miesieczne = [...wiersze.values()].sort((a, b) => a.rok - b.rok || a.miesiac - b.miesiac);
  const nm = dane.skladniki_miesieczne.length;
  if (nm && nm < 12) ostrz.push(`Odczytano ${nm} z 12 miesięcy wynagrodzeń – uzupełnij brakujące lub potwierdź.`);
  if (!nm && (dane.typ_dokumentu === "Z-3" || dane.typ_dokumentu === "Z-3a" || dane.typ_dokumentu === "mieszany")) ostrz.push("Nie znaleziono tabeli wynagrodzeń – wpisz miesiące ręcznie.");
  if (!dane.typ_dokumentu) ostrz.push("Nie rozpoznano rodzaju dokumentu. Czy to na pewno druk Z-3, Z-3a lub ZAM?");
  const slabe = linie.length ? linie.reduce((s, l) => s + l.pewnosc, 0) / linie.length : 0;
  if (strony.some((s) => s.zrodlo === "ocr") && slabe < 0.75) ostrz.push("Skan jest słabo czytelny – sprawdź każde pole.");
  return { strony: strony.length, zrodla: [...new Set(strony.map((s) => (s.zrodlo === "ocr" ? "odczyt skanu (OCR)" : "tekst z pliku PDF")))], dane, pewnosc, ostrzezenia: ostrz };
}

/** Podstawa wymiaru zasiłku z (poprawionych przez użytkownika) wierszy – liczy silnik. Null, gdy brak danych. */
export function policzPodstawe(d: Pick<DaneOdczytane, "typ_dokumentu" | "skladniki_miesieczne" | "zatrudnienie">) {
  const p = getParametry();
  const wiersze = (d.skladniki_miesieczne ?? []).filter((w) => w.rok && w.miesiac && w.dniObowiazany != null && w.dniObowiazany > 0);
  if (!wiersze.length) return null;
  if (d.typ_dokumentu !== "Z-3a") {
    const miesiace = wiersze.map((w) => wierszZ3NaMiesiac({ rok: w.rok, miesiac: w.miesiac, dniPrzepracowal: w.dniPrzepracowal ?? w.dniObowiazany!, dniObowiazany: w.dniObowiazany!, stale: w.stale ?? 0, zmiennePomniejszone: w.zmiennePomniejszone ?? 0, premieFaktyczne: w.premieFaktyczne ?? 0, procentSkladki: w.procentSkladki ?? undefined }));
    return { typ: "pracownik" as const, wynik: podstawaPracownik({ miesiace, pelnyWymiarEtatu: (d.zatrudnienie?.wymiar_etatu ?? 1) >= 1 }, p) };
  }
  return { typ: "niepracownik" as const, wynik: podstawaNiepracownik({ miesiace: wiersze.map((w) => ({ miesiac: `${w.rok}-${dwie(w.miesiac)}`, podstawaSkladek: w.stale ?? 0 })), zadeklarowanaKwota: false }, p) };
}
