// Uruchom:  node --experimental-strip-types test/zadluzenie.ts
// Zadłużenie na wybraną dzień (SYMULACJA). Oczekiwane kwoty policzone ręcznie z historii składek w data/personas/P02.json:
//   480 zł (wrzesień 2026, termin 15.10.2026, spłacone 20.01.2027), 300 zł (styczeń 2027, termin 15.02.2027), 900 zł (luty 2027, termin 15.03.2027).
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let bledy = 0, razem = 0;
const rowne = (nazwa: string, got: unknown, exp: unknown) => {
  razem++;
  if (JSON.stringify(got) === JSON.stringify(exp)) return;
  bledy++; console.error(`BŁĄD: ${nazwa}\n  jest:     ${JSON.stringify(got)}\n  oczekiwano: ${JSON.stringify(exp)}`);
};

const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    // next/server zastępujemy zaślepką (wystarczy NextResponse.json), żeby nie ładować frameworka w teście
    if (specifier === "next/server") return { url: "data:text/javascript,export const NextResponse={json:(b,i)=>Response.json(b,i)}", shortCircuit: true };
    const sciezka = specifier.startsWith("@/") ? new URL(`../src/${specifier.slice(2)}`, import.meta.url).href : specifier;
    const lokalna = sciezka.startsWith("file:") || sciezka.startsWith(".");
    const rozszerzenie = sciezka.endsWith(".ts") || sciezka.endsWith(".json");
    return nextResolve(lokalna && !rozszerzenie ? sciezka + ".ts" : sciezka, context);
  },
});
const { GET } = await import("../src/app/api/zus/zadluzenie/route.ts");
const { stanZadluzenia, numerZaswiadczenia, znajdzPersone } = await import("../src/lib/zus-mock.ts");
const { progZadluzenia } = await import("../src/engine/kalkulator.ts");
const parametry = JSON.parse(readFileSync(new URL("../data/parametry.json", import.meta.url), "utf8"));
const prog = progZadluzenia(parametry);
rowne("próg = 1 % płacy minimalnej", prog, 48.06);

process.env.DATA_DIR = fileURLToPath(new URL("../data", import.meta.url));
const marek = znajdzPersone("00000000002")!;
const stan = (d: string) => { const s = stanZadluzenia(marek, d, prog); return [s.kwota, s.wynik]; };

rowne("przed pierwszym terminem: brak zadłużenia", stan("2026-10-01"), [0, "brak_zadluzenia"]);
rowne("w dniu terminu płatności jeszcze bez zadłużenia", stan("2026-10-15"), [0, "brak_zadluzenia"]);
rowne("dzień po terminie: 480 zł powyżej progu", stan("2026-10-16"), [480, "powyzej_progu"]);
rowne("po spłacie 20.01.2027 (dzień spłaty): zero", stan("2027-01-20"), [0, "brak_zadluzenia"]);
rowne("dzień przed spłatą: nadal 480 zł", stan("2027-01-19"), [480, "powyzej_progu"]);
rowne("marzec 2027: tylko składka za styczeń", stan("2027-03-01"), [300, "powyzej_progu"]);
rowne("2 kwietnia 2027: 1200 zł (zgodnie z polem kwota profilu)", stan("2027-04-02"), [1200, "powyzej_progu"]);
rowne("kwota z historii = kwota w profilu na dzień profilu", stan(marek.zadluzenie.naDzien)[0], marek.zadluzenie.kwota);

const maly = { ...marek, zadluzenie: { ...marek.zadluzenie, skladniki: [{ rodzaj: "x", okres: "2027-01", kwota: 40, terminPlatnosci: "2027-02-15", splacono: null }] } };
rowne("40 zł < próg: prawo zachowane", [stanZadluzenia(maly, "2027-03-01", prog).wynik, stanZadluzenia(maly, "2027-03-01", prog).przekroczonyProg], ["ponizej_progu", false]);
const rowny = { ...maly, zadluzenie: { ...maly.zadluzenie, skladniki: [{ ...maly.zadluzenie.skladniki[0], kwota: prog }] } };
rowne("dokładnie próg nie blokuje (tak jak w silniku: > próg)", stanZadluzenia(rowny, "2027-03-01", prog).przekroczonyProg, false);

const ania = znajdzPersone("00000000001")!;
rowne("profil bez działalności: nie dotyczy", [stanZadluzenia(ania, "2027-03-15", prog).wynik, stanZadluzenia(ania, "2027-03-15", prog).kwota], ["nie_dotyczy", 0]);
rowne("numer zaświadczenia stały dla tej samej daty", numerZaswiadczenia("00000000002", "2027-03-01"), numerZaswiadczenia("00000000002", "2027-03-01"));
rowne("numer zaświadczenia różny dla innej daty", numerZaswiadczenia("00000000002", "2027-03-01") !== numerZaswiadczenia("00000000002", "2027-04-02"), true);

// API: ta sama ścieżka co w aplikacji
hook.deregister();
const pobierz = async (query: string) => { const r = await GET(new Request(`http://x/api/zus/zadluzenie?${query}`)); return { status: r.status, body: await r.json() }; };
const a = await pobierz("pesel=00000000002&naDzien=2026-11-21");
const b = await pobierz("pesel=00000000002&naDzien=2027-02-01");
const c = await pobierz("pesel=00000000002&naDzien=2027-04-02");
rowne("API: 3 daty = 3 różne kwoty", [a.body.kwotaZadluzenia, b.body.kwotaZadluzenia, c.body.kwotaZadluzenia], [480, 0, 1200]);
rowne("API: wynik zależny od daty", [a.body.wynik, b.body.wynik, c.body.wynik], ["powyzej_progu", "brak_zadluzenia", "powyzej_progu"]);
rowne("API: próg i flaga przekroczenia", [c.body.prog, c.body.przekroczonyProg, b.body.przekroczonyProg], [48.06, true, false]);
rowne("API: oznaczone jako symulacja, ma numer i datę wystawienia", [c.body.symulacja, /^ZAD\/2027\/\d{6}$/.test(c.body.numerZaswiadczenia), /^\d{4}-\d{2}-\d{2}$/.test(c.body.wystawiono)], [true, true, true]);
const d = await pobierz("pesel=00000000001&naDzien=2027-03-15");
rowne("API: profil bez działalności", [d.status, d.body.wynik, d.body.kwotaZadluzenia, d.body.komunikat.length > 0], [200, "nie_dotyczy", 0, true]);
rowne("API: zła data = 400", (await pobierz("pesel=00000000002&naDzien=jutro")).status, 400);
rowne("API: nieznany PESEL = 404", (await pobierz("pesel=123&naDzien=2027-03-15")).status, 404);

console.log(bledy ? `Zadłużenie: ${bledy} z ${razem} testów nie przeszło` : `Zadłużenie: ${razem} testów OK`);
process.exit(bledy ? 1 : 0);
