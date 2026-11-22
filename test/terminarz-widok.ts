// Uruchom: node --experimental-strip-types test/terminarz-widok.ts   (Node 22+)
// Test widoku Terminarza bez przeglądarki: dane kontrolne z briefu (poród 15.01.2027), grupowanie względem
// „dzisiaj”, walidacja formularza, zapis w localStorage i linki do druków. Daty liczy tylko buildCalendar.
import { readFileSync } from "node:fs";
import { buildCalendar, toICS, EMPLOYMENT, ROLES } from "../src/lib/terminarz/terminarz.js";
import {
  GRUPY, KLUCZ_ZAPISU, OKNO_TERAZ_DNI, OKNO_WKROTCE_DNI, PUSTY_FORMULARZ,
  dniMiedzy, grupaDla, ileDni, kategorieZLiczbami, linkiDoDrukow, pogrupuj, waliduj,
  wczytajFormularz, wyczyscZapis, zapiszFormularz,
} from "../src/lib/terminarz/widok.ts";

const json = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const reguly = json("../src/lib/terminarz/rules.json");
const parametry = json("../data/parametry.json");
const druki = json("../src/content/poradnik/druki.json").druki;
const zapasowe = json("../src/lib/terminarz/druki-linki.json").druki;

let ok = 0, fail = 0;
function rowne(nazwa: string, got: unknown, exp: unknown) {
  if (JSON.stringify(got) === JSON.stringify(exp)) ok++;
  else { fail++; console.log(`FAIL  ${nazwa}\n   oczekiwano: ${JSON.stringify(exp)}\n   jest:       ${JSON.stringify(got)}`); }
}

const policz = (input: Parameters<typeof buildCalendar>[1]) => buildCalendar(reguly, input, { params: parametry });
const data = (ev: ReturnType<typeof policz>, id: string) => ev.find((e) => e.id === id)?.date;

// ---- dane kontrolne z briefu ----
const mama = policz({ birthDate: "2027-01-15", role: "mama", employment: "umowa", children: 1 });
rowne("mama/umowa/1: liczba wydarzeń", mama.length, 19);
rowne("mama: wniosek o urlop uzupełniający 21 dni przed końcem macierzyńskiego", data(mama, "uzup-wniosek"), "2027-05-13");
rowne("mama: usc", data(mama, "usc"), "2027-02-05");
rowne("mama: zam-815", data(mama, "zam-815"), "2027-02-05");
rowne("mama: plus800", data(mama, "plus800"), "2027-04-15");
rowne("mama: rodz-wniosek", data(mama, "rodz-wniosek"), "2027-05-14");
rowne("mama: becikowe", data(mama, "becikowe"), "2028-01-15");

const tata = policz({ birthDate: "2027-01-15", role: "tata", employment: "jdg", children: 3 });
rowne("tata/jdg/3: liczba wydarzeń", tata.length, 17);
rowne("tata: ojcowski", data(tata, "ojcowski"), "2028-01-14");
rowne("tata: tata-macierzynski", data(tata, "tata-macierzynski"), "2027-04-09");
rowne("tata: jest kdr", data(tata, "kdr") !== undefined, true);
rowne("tata: nie ma chorobowe90", data(tata, "chorobowe90"), undefined);

const brak = policz({ birthDate: "2027-01-15", role: "mama", employment: "brak", children: 1 });
rowne("mama/brak: jest swiadczenie-rodz", data(brak, "swiadczenie-rodz") !== undefined, true);
rowne("mama/brak: nie ma zcna", data(brak, "zcna"), undefined);
rowne("mama/brak: nie ma zam-umowa", data(brak, "zam-umowa"), undefined);

// ---- zmiana daty przesuwa oś, zmiana roli/zatrudnienia dodaje i usuwa ----
const mamaPozniej = policz({ birthDate: "2027-01-25", role: "mama", employment: "umowa", children: 1 });
rowne("data +10 dni: usc +10 dni", data(mamaPozniej, "usc"), "2027-02-15");
rowne("data +10 dni: ta sama liczba wydarzeń", mamaPozniej.length, mama.length);
for (const [id, d] of [["plus800", "2027-04-25"], ["becikowe", "2028-01-25"], ["rodz-wniosek", "2027-05-24"], ["macierz-koniec", "2027-06-13"]]) rowne("data +10 dni: " + id, data(mamaPozniej, id), d);
const idMama = new Set(mama.map((e) => e.id));
const idTata = new Set(tata.map((e) => e.id));
const mamaZlecenie = new Set(policz({ birthDate: "2027-01-15", role: "mama", employment: "zlecenie", children: 1 }).map((e) => e.id));
rowne("rola zmienia zestaw (ojcowski)", [idMama.has("ojcowski"), idTata.has("ojcowski")], [false, true]);
rowne("zatrudnienie zmienia zestaw (zam-inne, zam-umowa)", [idMama.has("zam-inne"), mamaZlecenie.has("zam-inne"), idMama.has("zam-umowa"), mamaZlecenie.has("zam-umowa")], [false, true, true, false]);

// ---- grupowanie względem dzisiejszej daty ----
const dzis = "2027-01-10"; // 5 dni przed porodem
const grupy = pogrupuj(mama, dzis);
const wszystkie = GRUPY.flatMap((g) => grupy[g.id]);
rowne("każde wydarzenie w dokładnie jednej grupie", wszystkie.length, mama.length);
rowne("w każdej grupie daty rosnąco", GRUPY.every((g) => grupy[g.id].every((e, i, a) => i === 0 || a[i - 1].date <= e.date)), true);
rowne("w „Teraz” tylko okno dni", grupy.teraz.every((e) => { const d = dniMiedzy(dzis, e.date); return d >= 0 && d <= OKNO_TERAZ_DNI; }), true);
rowne("w „Wkrótce” okno za „Teraz”", grupy.wkrotce.every((e) => { const d = dniMiedzy(dzis, e.date); return d > OKNO_TERAZ_DNI && d <= OKNO_WKROTCE_DNI; }), true);
rowne("w „Później” tylko po oknie", grupy.pozniej.every((e) => dniMiedzy(dzis, e.date) > OKNO_WKROTCE_DNI), true);
rowne("w „Minęło” tylko przeszłość", grupy.minelo.every((e) => dniMiedzy(dzis, e.date) < 0), true);
rowne("poród (za 5 dni) jest w „Teraz”", grupy.teraz.some((e) => e.isBirth), true);
rowne("usc (za 26 dni) jest w „Wkrótce”", grupy.wkrotce.some((e) => e.id === "usc"), true);
rowne("becikowe jest w „Później”", grupy.pozniej.some((e) => e.id === "becikowe"), true);
rowne("macierz-start (przed dzisiaj) jest w „Minęło”", grupy.minelo.some((e) => e.id === "macierz-start"), true);
rowne("granice grup", [grupaDla(-1), grupaDla(0), grupaDla(OKNO_TERAZ_DNI), grupaDla(OKNO_TERAZ_DNI + 1), grupaDla(OKNO_WKROTCE_DNI), grupaDla(OKNO_WKROTCE_DNI + 1)],
  ["minelo", "teraz", "teraz", "wkrotce", "wkrotce", "pozniej"]);

const poFiltrze = pogrupuj(mama, dzis, "usc");
const wFiltrze = GRUPY.flatMap((g) => poFiltrze[g.id]);
rowne("filtr po kategorii zostawia kategorię i punkt odniesienia", wFiltrze.every((e) => e.category === "usc" || e.isBirth), true);
rowne("filtr po kategorii: usc i poród", wFiltrze.map((e) => e.id).sort(), ["porod", "usc"]);
rowne("kategorie nie liczą porodu", kategorieZLiczbami(mama).reduce((n, k) => n + k.liczba, 0), mama.length - 1);

rowne("ileDni", [ileDni(0), ileDni(1), ileDni(5), ileDni(-1), ileDni(-3), ileDni(22)], ["dziś", "jutro", "za 5 dni", "wczoraj", "3 dni temu", "za 22 dni"]);
rowne("dniMiedzy przez zmianę czasu", dniMiedzy("2027-03-27", "2027-03-29"), 2);

// ---- walidacja formularza ----
const w0 = waliduj(PUSTY_FORMULARZ, ROLES, EMPLOYMENT);
rowne("pusty formularz: brak wejścia i 4 braki", [w0.wejscie, w0.brakuje.length], [null, 4]);
const w1 = waliduj({ birthDate: "2027-02-30", role: "mama", employment: "umowa", children: "1" }, ROLES, EMPLOYMENT);
rowne("zła data: błąd i brak wejścia", [w1.bladDaty !== "", w1.wejscie], [true, null]);
const w2 = waliduj({ birthDate: "2027-01-15", role: "tata", employment: "jdg", children: "0" }, ROLES, EMPLOYMENT);
rowne("0 dzieci: błąd", [w2.bladDzieci !== "", w2.wejscie], [true, null]);
rowne("ułamek dzieci: błąd", waliduj({ birthDate: "2027-01-15", role: "tata", employment: "jdg", children: "1.5" }, ROLES, EMPLOYMENT).bladDzieci !== "", true);
rowne("rok poza zakresem: błąd", waliduj({ birthDate: "0027-01-15", role: "mama", employment: "umowa", children: "1" }, ROLES, EMPLOYMENT).bladDaty !== "", true);
const w3 = waliduj({ birthDate: "2027-01-15", role: "tata", employment: "jdg", children: "3" }, ROLES, EMPLOYMENT);
rowne("poprawny formularz", w3.wejscie, { birthDate: "2027-01-15", role: "tata", employment: "jdg", children: 3 });
rowne("wejście z formularza daje 17 wydarzeń", policz(w3.wejscie!).length, 17);

// ---- zapis w localStorage (try/catch) ----
const fake = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};
const s = fake();
const f = { birthDate: "2027-01-15", role: "mama" as const, employment: "umowa" as const, children: "1" };
zapiszFormularz(s, f);
rowne("zapis i odczyt", wczytajFormularz(s, ROLES, EMPLOYMENT), f);
rowne("zapis nie zawiera PESEL ani innych pól", Object.keys(JSON.parse(s.m.get(KLUCZ_ZAPISU)!)).sort(), ["birthDate", "children", "employment", "role"]);
s.m.set(KLUCZ_ZAPISU, JSON.stringify({ birthDate: "2027-13-40", role: "dziadek", employment: "x", children: "abc" }));
rowne("śmieci w zapisie dają pusty formularz", wczytajFormularz(s, ROLES, EMPLOYMENT), PUSTY_FORMULARZ);
s.m.set(KLUCZ_ZAPISU, "{nie json");
rowne("uszkodzony JSON dają pusty formularz", wczytajFormularz(s, ROLES, EMPLOYMENT), PUSTY_FORMULARZ);
const wybuchowy = { getItem: () => { throw new Error("blokada"); }, setItem: () => { throw new Error("blokada"); }, removeItem: () => { throw new Error("blokada"); } };
rowne("zablokowany localStorage: odczyt", wczytajFormularz(wybuchowy, ROLES, EMPLOYMENT), PUSTY_FORMULARZ);
zapiszFormularz(wybuchowy, f); wyczyscZapis(wybuchowy); ok++;
rowne("brak localStorage: odczyt", wczytajFormularz(undefined, ROLES, EMPLOYMENT), PUSTY_FORMULARZ);
zapiszFormularz(s, f); wyczyscZapis(s);
rowne("wyczyść usuwa zapis", s.m.size, 0);

// ---- linki do druków ----
const dlaZ3a = linkiDoDrukow(["ZUS Z-3a (zlecenie, od zleceniodawcy)"], [], druki, zapasowe);
rowne("Z-3a nie myli się z Z-3", dlaZ3a.map((l) => l.url), ["https://www.zus.pl/-/zaswiadczenie-zus-z-3a"]);
const dlaZ3 = linkiDoDrukow(["ZUS Z-3 (od pracodawcy)"], [], druki, zapasowe);
rowne("Z-3", dlaZ3.map((l) => l.url), ["https://www.zus.pl/-/zaswiadczenie-zus-z-3"]);
const zamUmowa = mama.find((e) => e.id === "zam-umowa")!;
rowne("druk z linkiem w regule nie jest dublowany", linkiDoDrukow(zamUmowa.forms, zamUmowa.links, druki, zapasowe).map((l) => l.url), []);
rowne("forma bez druku w druki.json nie daje linku", linkiDoDrukow(["Zaświadczenie lekarskie o ciąży"], [], druki, zapasowe), []);
rowne("url_zus z druki.json ma pierwszeństwo", linkiDoDrukow(["ZUS ZAM"], [], [{ id: "ZAM", nazwa: "ZAM", url_zus: "https://www.zus.pl/inny" }], zapasowe).map((l) => l.url), ["https://www.zus.pl/inny"]);
rowne("wszystkie linki z reguł to https", reguly.rules.every((r: { links?: { url: string }[] }) => (r.links ?? []).every((l) => l.url.startsWith("https://"))), true);

// ---- ICS zawiera wszystkie wydarzenia i linki ----
const ics = toICS(mama, { now: new Date("2026-11-21T10:00:00Z") });
rowne("ICS: liczba wydarzeń", (ics.match(/BEGIN:VEVENT/g) ?? []).length, mama.length);
rowne("ICS: linki do druków w opisie", ics.replace(/\r\n /g, "").includes("https://www.zus.pl/-/wniosek-zas-54"), true);

console.log(`WYNIK: ${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
