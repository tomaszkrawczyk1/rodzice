// Uruchom: node --experimental-strip-types test/ux.ts   (Node 22+)
// Mechanika przewijania, fokusu i stanu kroku w sprawach. Bez przeglądarki: tylko czysta logika.
import { celPrzewijania, czyZasloniety, MARGINES } from "../src/lib/ekran.ts";
import { dataZFormularza } from "../src/lib/data-formularza.ts";
import { odczytajWpis, polaczPrzyPowrocie, stanHistorii, type Migawka } from "../src/lib/stan-sprawy.ts";

let ok = 0, fail = 0;
function rowne(nazwa: string, got: unknown, exp: unknown) {
  if (JSON.stringify(got) === JSON.stringify(exp)) ok++;
  else { fail++; console.log(`FAIL  ${nazwa}\n   oczekiwano: ${JSON.stringify(exp)}\n   jest:       ${JSON.stringify(got)}`); }
}

// ---- przewijanie: tytuł ma wylądować pod przyklejonym nagłówkiem, nie pod nim ----
rowne("brak nagłówka: tytuł 400 px niżej, strona na 0", celPrzewijania(400, 0, 0), 400 - MARGINES);
rowne("nagłówek 100 px: tytuł 400 px niżej", celPrzewijania(400, 0, 100), 400 - 100 - MARGINES);
rowne("po przewinięciu: scrollY 300, tytuł 50 px od góry okna", celPrzewijania(50, 300, 0), 350 - MARGINES);
rowne("nie schodzimy poniżej zera", celPrzewijania(5, 0, 0), 0);
rowne("tytuł nad oknem (ujemne top) przewija w górę", celPrzewijania(-200, 600, 0), 600 - 200 - MARGINES);
const wynik = celPrzewijania(400, 0, 100);
rowne("po przewinięciu tytuł nie jest zasłonięty", czyZasloniety(400 - wynik, 440 - wynik, 100, 800), false);

// ---- zasłonięty fokus ----
rowne("pod nagłówkiem 100 px, element od 60 px", czyZasloniety(60, 110, 100, 800), true);
rowne("tuż pod nagłówkiem", czyZasloniety(100, 150, 100, 800), false);
rowne("poniżej dolnej krawędzi okna", czyZasloniety(790, 840, 0, 800), true);
rowne("cały nad oknem", czyZasloniety(-50, -10, 0, 800), true);

// ---- stan kroku w historii ----
const ID = ["a", "b", "c"];
const m: Migawka = { faza: "pytania", historia: ["a", "b"], odp: { a: "tak", b: "5000" }, potwierdzone: {} };
const wpis = { s: "sprawa", t: "tok", n: 2, m };
const stan = stanHistorii({ __NA: true, inne: 1 }, wpis);
rowne("stan routera zostaje, dochodzi tylko rks", [stan.__NA, stan.inne, Object.keys(stan).includes("rks")], [true, 1, true]);
rowne("poprawny wpis wraca bez zmian", odczytajWpis(stan, "sprawa", "tok", ID), wpis);
rowne("inna sprawa: ignoruj", odczytajWpis(stan, "inna", "tok", ID), null);
rowne("inny token (inny profil): ignoruj", odczytajWpis(stan, "sprawa", "", ID), null);
rowne("brak stanu", odczytajWpis(null, "sprawa", "tok", ID), null);
rowne("stan bez rks (zwykły stan routera)", odczytajWpis({ __NA: true }, "sprawa", "tok", ID), null);
rowne("nieznane pytanie w odpowiedziach", odczytajWpis(stanHistorii(null, { ...wpis, m: { ...m, odp: { x: "1" } } }), "sprawa", "tok", ID), null);
rowne("nieznana faza", odczytajWpis(stanHistorii(null, { ...wpis, m: { ...m, faza: "cos" as never } }), "sprawa", "tok", ID), null);
rowne("odpowiedź nie jest tekstem", odczytajWpis(stanHistorii(null, { ...wpis, m: { ...m, odp: { a: 5 as never } } }), "sprawa", "tok", ID), null);
rowne("ujemny numer kroku", odczytajWpis(stanHistorii(null, { ...wpis, n: -1 }), "sprawa", "tok", ID), null);

// ---- cofnięcie nie kasuje odpowiedzi ----
const wczesniej: Migawka = { faza: "pytania", historia: ["a"], odp: { a: "tak" }, potwierdzone: {} };
rowne("po cofnięciu zostają późniejsze odpowiedzi", polaczPrzyPowrocie(wczesniej, m, true).odp, { a: "tak", b: "5000" });
rowne("po cofnięciu historia i faza są z wcześniejszego kroku", [polaczPrzyPowrocie(wczesniej, m, true).historia, polaczPrzyPowrocie(wczesniej, m, true).faza], [["a"], "pytania"]);
rowne("ruch do przodu bierze zapisaną migawkę", polaczPrzyPowrocie(m, wczesniej, false), m);

// ---- data wpisywana z klawiatury dziesiętnej telefonu (kropka albo przecinek) ----
rowne("data z kropkami", dataZFormularza("5.04.2027"), "2027-04-05");
rowne("data z przecinkami (klawiatura dziesiętna)", dataZFormularza("5,04,2027"), "2027-04-05");
rowne("data z myślnikami", dataZFormularza("05-04-2027"), "2027-04-05");
rowne("data ze spacjami", dataZFormularza("5 4 2027"), "2027-04-05");
rowne("data ze skośnikami", dataZFormularza("5/4/2027"), "2027-04-05");
rowne("nadal odrzuca nieistniejącą datę", dataZFormularza("31,02,2027"), "");
rowne("nadal odrzuca śmieci", dataZFormularza("jutro"), "");

console.log(`WYNIK: ${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
