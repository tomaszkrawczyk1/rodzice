// Uruchom:  node --experimental-strip-types testy.ts   (Node 22+; w Node 24 flaga niepotrzebna)
// Oczekiwane liczby poniżej policzono NIEZALEŻNIE od silnika (osobne obliczenie 6500*0,8629 itd.),
// nie wygenerowano ich z silnika. Jeśli test pada — to jest błąd w silniku (albo w parametrach), nie w teście.
import { readFileSync } from "node:fs";
import { testySpraw } from "./sprawy.ts";
import { testyWsparcie } from "./wsparcie.ts";
import { testyRodziceUI } from "./rodzice-ui.ts";
import {
  podstawaPracownik, podstawaNiepracownik, wierszZ3NaMiesiac, swiadczenieRehabilitacyjne, swiadczenieRodzicielskie, zasilekChorobowyWCiazy, wymiarMacierzynski, wymiarRodzicielski, maxRodzicielskiPrzyLaczeniu,
  wymiarUzupelniajacy, planZasilku, porownajWarianty, uprawnienia, minPodstawaZasilkuPracownik, maxPodstawaZasilkuNiepracownik, r2,
  nettoMiesieczne, planZNetto, szybkiePorownanie, podstawaZKwoty,
} from "../src/engine/kalkulator.ts";

const p = JSON.parse(readFileSync(new URL("../data/parametry.json", import.meta.url), "utf8"));
let ok = 0, fail = 0;
function rowne(nazwa: string, got: unknown, exp: unknown, tol = 0) {
  const pass = typeof got === "number" && typeof exp === "number" ? Math.abs(got - exp) <= tol + 1e-9 : JSON.stringify(got) === JSON.stringify(exp);
  if (pass) ok++; else { fail++; console.log(`FAIL  ${nazwa}\n   oczekiwano: ${JSON.stringify(exp)}\n   jest:       ${JSON.stringify(got)}`); }
}
const mies = (n: number, kwota: number) => Array.from({ length: n }, (_, i) => ({ miesiac: `2026-${String(i + 1).padStart(2, "0")}`, kwota }));

// ---- wartości z Załącznika ZUS ----
rowne("min podstawa zasiłku 2026 (4806 - 13,71 %)", minPodstawaZasilkuPracownik(p), 4147.10);
rowne("max podstawa zasiłku niepracownika 2026 (Załącznik: 20 321,30)", maxPodstawaZasilkuNiepracownik(p), 20321.30);
for (const [n, t] of [[1, 20], [2, 31], [3, 33], [4, 35], [5, 37], [6, 37]] as const) rowne(`macierzyński ${n} dz.`, wymiarMacierzynski(n, p), t);
rowne("rodzicielski 1", wymiarRodzicielski(1, false, p), 41); rowne("rodzicielski 2+", wymiarRodzicielski(3, false, p), 43);
rowne("rodzicielski Za życiem 1", wymiarRodzicielski(1, true, p), 65); rowne("rodzicielski Za życiem 2+", wymiarRodzicielski(2, true, p), 67);
rowne("max łączenie 1", maxRodzicielskiPrzyLaczeniu(1, false, p), 82); rowne("max łączenie 2+", maxRodzicielskiPrzyLaczeniu(2, false, p), 86);
rowne("max łączenie Za życiem 1", maxRodzicielskiPrzyLaczeniu(1, true, p), 130); rowne("max łączenie Za życiem 2+", maxRodzicielskiPrzyLaczeniu(2, true, p), 134);

// ---- podstawa wymiaru ----
const a = podstawaPracownik({ miesiace: mies(12, 6500), pelnyWymiarEtatu: true }, p);
rowne("Anna: podstawa miesięczna (6500 * 0,8629)", a.podstawaMiesieczna, 5608.85);
rowne("Anna: podstawa dzienna", a.podstawaDzienna, 186.96);
const niska = podstawaPracownik({ miesiace: mies(12, 4000), pelnyWymiarEtatu: true }, p);
rowne("pełny etat poniżej minimum -> minimum 4147,10", niska.podstawaMiesieczna, 4147.10);
const niskaCzesc = podstawaPracownik({ miesiace: mies(12, 4000), pelnyWymiarEtatu: false }, p);
rowne("niepełny etat — minimum NIE obowiązuje (4000*0,8629)", niskaCzesc.podstawaMiesieczna, 3451.60);
const wyl = podstawaPracownik({ miesiace: [...mies(10, 6000), { miesiac: "2026-11", kwota: 1000, mniejNizPolowaCzasuPracy: true }, { miesiac: "2026-12", kwota: 1000, mniejNizPolowaCzasuPracy: true }], pelnyWymiarEtatu: true }, p);
rowne("miesiące z < połową czasu pracy wyłączone (6000*0,8629)", wyl.podstawaMiesieczna, 5177.40);
const premie = podstawaPracownik({ miesiace: mies(12, 5000), premieRoczne: 12000, pelnyWymiarEtatu: true }, p);
rowne("premia roczna 12000 => +1000 do średniej ((5000+1000)*0,8629)", premie.podstawaMiesieczna, 5177.40);
const miesNp = (n: number, k: number) => mies(n, k).map(m => ({ miesiac: m.miesiac, podstawaSkladek: m.kwota }));
const jdg = podstawaNiepracownik({ miesiace: miesNp(12, 10000), zadeklarowanaKwota: true }, p);
rowne("JDG: 10000 * 0,8629", jdg.podstawaMiesieczna, 8629.00);
const jdgMax = podstawaNiepracownik({ miesiace: miesNp(12, 23550), zadeklarowanaKwota: true }, p);
rowne("JDG na limicie 23550 -> 20321,30", jdgMax.podstawaMiesieczna, 20321.30);

// ---- zasiłek: Anna, matka 32 tyg. rodzicielskiego + ojciec 9 tyg. ----
const baza = { tytul: "porod" as const, dataZdarzenia: "2027-03-15", liczbaDzieci: 1, podstawy: { matka: 5608.85, ojciec: 5608.85 },
  rodzicielski: [{ kto: "matka" as const, tygodnie: 32 }, { kto: "ojciec" as const, tygodnie: 9 }] };
const z = planZasilku({ ...baza, wariant: "zmienny_100_70" }, p);
rowne("brak błędów", z.bledy, []);
const mac = z.okresy.find(o => o.rodzaj === "macierzynski")!;
rowne("macierzyński 140 dni", mac.dni, 140);
rowne("macierzyński kwota 100 % (5608,85*140/30)", mac.kwota, 26174.63);
rowne("macierzyński: od 2027-03-15 do 2027-08-01", [mac.od, mac.do], ["2027-03-15", "2027-08-01"]);  // 15.03 + 139 dni = 1.08 (140 dni włącznie z dniem porodu)
const sumaRodzZm = z.okresy.filter(o => o.rodzaj.startsWith("rodzicielski")).reduce((s, o) => s + o.kwota, 0);
rowne("rodzicielski 41 tyg. = 287 dni * 70 % (suma matka+ojciec)", r2(sumaRodzZm), 37560.60, 0.02);
rowne("ojciec 9 tyg. @70 % = 63 dni", z.sumy.ojciec, 8245.01, 0.01);

const u = planZasilku({ ...baza, wariant: "usredniony_81_5" }, p);
rowne("wariant 81,5 %: matka 20+32 tyg = 364 dni (5608,85*0,815*364/30)", u.sumy.matka, 55464.05, 0.02);
rowne("wariant 81,5 %: 9 tyg. ojca nadal 70 %", u.sumy.ojciec, 8245.01, 0.01);
const por = porownajWarianty(baza, p);
rowne("81,5 % vs 100/70 — różnica małe (< 100 zł) — sprawdzenie sensowności", Math.abs(por.roznicaRazem) < 100, true);

// ---- łączenie pracy z urlopem: ta sama suma pieniędzy, dłuższy okres ----
const bezP = planZasilku({ tytul: "porod", dataZdarzenia: "2027-05-05", liczbaDzieci: 2, podstawy: { matka: 6000 }, wariant: "zmienny_100_70", rodzicielski: [{ kto: "matka", tygodnie: 10 }] }, p);
const zP = planZasilku({ tytul: "porod", dataZdarzenia: "2027-05-05", liczbaDzieci: 2, podstawy: { matka: 6000 }, wariant: "zmienny_100_70", rodzicielski: [{ kto: "matka", tygodnie: 10, wspolczynnikPracy: 0.5 }] }, p);
const rb = bezP.okresy.find(o => o.rodzaj === "rodzicielski")!, rz = zP.okresy.find(o => o.rodzaj === "rodzicielski")!;
rowne("połowa etatu: 10 tyg. urlopu => 140 dni kalendarzowych (20 tyg.)", rz.dni, 140);
rowne("połowa etatu: łączna kwota = jak bez pracy za 10 tyg. (70 dni * 6000/30 * 0,7)", rz.kwota, rb.kwota, 0.02);
rowne("połowa etatu: kwota/dzień = połowa", rz.kwotaDzienna * 2, rb.kwotaDzienna, 0.01);
const w25 = planZasilku({ tytul: "porod", dataZdarzenia: "2027-05-05", liczbaDzieci: 1, podstawy: { matka: 6000 }, wariant: "zmienny_100_70", rodzicielski: [{ kto: "matka", tygodnie: 32, wspolczynnikPracy: 0.25 }] }, p);
rowne("25 % etatu: 32/(1-0,25) = 42,67 tyg = 298 dni (dni niepełne pomijane)", w25.okresy.find(o => o.rodzaj === "rodzicielski")!.dni, 298);
const zaDuzo = planZasilku({ ...baza, wariant: "zmienny_100_70", rodzicielski: [{ kto: "matka", tygodnie: 10, wspolczynnikPracy: 0.6 }] }, p);
rowne("praca > 1/2 etatu => błąd", zaDuzo.bledy.length > 0, true);

// ---- walidacje podziału ----
const zaDuzoMatka = planZasilku({ ...baza, wariant: "zmienny_100_70", rodzicielski: [{ kto: "matka", tygodnie: 41 }] }, p);
rowne("matka 41 tyg. rodzicielskiego => błąd (9 tyg. niezbywalne)", zaDuzoMatka.bledy.length > 0, true);
const ojcZa14 = planZasilku({ ...baza, wariant: "zmienny_100_70", macierzynskiOjciecPrzejmujeTyg: 10, rodzicielski: [] }, p);
rowne("ojciec przejmuje macierzyński — matka ma po porodzie 10 tyg. (<14) => błąd", ojcZa14.bledy.length > 0, true);
const ojcOk = planZasilku({ ...baza, wariant: "zmienny_100_70", macierzynskiOjciecPrzejmujeTyg: 6, rodzicielski: [] }, p);
rowne("ojciec przejmuje 6 tyg. (matka 14) => OK", ojcOk.bledy, []);
const piec = planZasilku({ ...baza, wariant: "zmienny_100_70", rodzicielski: Array.from({ length: 6 }, () => ({ kto: "matka" as const, tygodnie: 5 })) }, p);
rowne("6 części rodzicielskiego => błąd (max 5)", piec.bledy.some(b => b.includes("5 części")), true);

// ---- martwe dziecko, zgon, ojcowski ----
const mart = planZasilku({ tytul: "porod", dataZdarzenia: "2027-09-12", liczbaDzieci: 1, podstawy: { matka: 6040.30 }, wariant: "zmienny_100_70", martwe: {}, rodzicielski: [] }, p);
rowne("martwe: 8 tyg = 56 dni", mart.okresy[0].dni, 56);
rowne("martwe: kwota 100 % (6040,30*56/30)", mart.okresy[0].kwota, 11275.23, 0.01);  // 6040,30 * 56 / 30 = 11275,2267
const oj = planZasilku({ tytul: "porod", dataZdarzenia: "2027-04-02", liczbaDzieci: 1, podstawy: { matka: 6000, ojciec: 8629 }, wariant: "zmienny_100_70", rodzicielski: [], ojcowski: [{ od: "2027-04-10", dni: 14 }] }, p);
rowne("ojcowski 14 dni @100 % (8629*14/30)", oj.okresy.find(o => o.rodzaj === "ojcowski")!.kwota, 4026.87, 0.01);
const oj3 = planZasilku({ ...baza, wariant: "zmienny_100_70", rodzicielski: [], ojcowski: [{ od: "2027-04-10", dni: 7 }, { od: "2027-04-20", dni: 4 }] }, p);
rowne("ojcowski: część < 7 dni => błąd", oj3.bledy.length > 0, true);

// ---- podwyższenie do świadczenia rodzicielskiego (1000 zł) ----
const niski = planZasilku({ tytul: "porod", dataZdarzenia: "2027-01-10", liczbaDzieci: 1, podstawy: { matka: 1000 }, wariant: "zmienny_100_70", rodzicielski: [{ kto: "matka", tygodnie: 4 }, { kto: "ojciec", tygodnie: 9 }], }, p);
// ZUWAGA: ojciec bez podstawy => błąd; sprawdzamy tylko czytelność komunikatu
rowne("brak podstawy ojca => komunikat błędu", niski.bledy.some(b => b.includes("ojciec")), true);
const niski2 = planZasilku({ tytul: "porod", dataZdarzenia: "2027-01-10", liczbaDzieci: 1, podstawy: { matka: 1000 }, wariant: "zmienny_100_70", rodzicielski: [{ kto: "matka", tygodnie: 30 / 7 }] }, p);
rowne("rodzicielski 70 % z 1000 = 700 -> podwyższone do 1000 za 30 dni", niski2.okresy.find(o => o.rodzaj === "rodzicielski")!.kwota, 1000.00, 0.01);

// ---- uzupełniający (Załącznik: wcześniak) ----
const uz = (tc: number, g: number, dni: number) => wymiarUzupelniajacy({ dataPorodu: "2027-05-28", tydzienCiazyUkonczone: tc, masaUrodzeniowaG: g, pobytySzpital: [{ od: "2027-05-28", do: dodajD("2027-05-28", dni - 1) }] }, p).tygodnie;
function dodajD(s: string, n: number) { return new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) + n * 86400000).toISOString().slice(0, 10); }
rowne("Ewa: 31 tc, 6 tyg. (42 dni) w szpitalu => 6 tyg.", uz(31, 1600, 42), 6);
rowne("33 tc, 10 dni => 2 tyg. (niepełny tydzień w górę)", uz(33, 1800, 10), 2);
rowne("33 tc, 70 dni w szpitalu => limit 8 tyg.", uz(33, 1800, 70), 8);
rowne("26 tc, 100 dni => 15 tyg. (100/7 w górę)", uz(26, 800, 100), 15);
rowne("26 tc, 200 dni => limit 15 tyg.", uz(26, 800, 200), 15);
rowne("masa 950 g, 38 tc, 20 dni => 3 tyg. (masa <=1000 g => limit 15)", uz(38, 950, 20), 3);
rowne("po 37 tc, pobyt od porodu (dzień 1) < dnia 5 => brak prawa", uz(39, 3200, 3), 0);

// ---- uprawnienia ----
const kat = uprawnienia({ tytul: "zlecenie", dobrowolneChorobowe: false, dniNieprzerwanegoUbezpieczeniaChorobowego: 0, ubezpieczonaWDniuPorodu: false }, p);
rowne("Katarzyna: brak zasiłku chorobowego i macierzyńskiego", [kat.zasilekChorobowyWCiazy.przysluguje, kat.zasilekMacierzynski.przysluguje], [false, false]);
rowne("Katarzyna: wskazano świadczenie rodzicielskie", !!kat.alternatywa && kat.alternatywa.includes("1000"), true);
const mar = uprawnienia({ tytul: "dzialalnosc", dobrowolneChorobowe: true, dniNieprzerwanegoUbezpieczeniaChorobowego: 1095, ubezpieczonaWDniuPorodu: true, zadluzenieSkladkowePLN: 1200 }, p);
rowne("Marek: macierzyński przysługuje, ale ZAWIESZONY (dług 1200 > 48,06)", [mar.zasilekMacierzynski.przysluguje, mar.zasilekMacierzynski.zawieszonyDoSplatyZadluzenia], [true, true]);
rowne("próg zadłużenia = 1 % płacy min. = 48,06 zł", mar.kwotaProguZadluzenia, 48.06);
const marOk = uprawnienia({ tytul: "dzialalnosc", dobrowolneChorobowe: true, dniNieprzerwanegoUbezpieczeniaChorobowego: 1095, ubezpieczonaWDniuPorodu: true, zadluzenieSkladkowePLN: 40 }, p);
rowne("dług 40 zł (< 48,06) => nie blokuje", marOk.zasilekMacierzynski.zawieszonyDoSplatyZadluzenia, false);
const nowa = uprawnienia({ tytul: "umowa_o_prace", dobrowolneChorobowe: false, dniNieprzerwanegoUbezpieczeniaChorobowego: 20, ubezpieczonaWDniuPorodu: true, liczbaUbezpieczonychPlatnika: 80 }, p);
rowne("pracownik, 20 dni ubezpieczenia: chorobowy w ciąży NIE (karencja 30), macierzyński TAK", [nowa.zasilekChorobowyWCiazy.przysluguje, nowa.zasilekMacierzynski.przysluguje], [false, true]);
rowne("duży płatnik (80 os.) wypłaca sam", nowa.ktoWyplaca, "pracodawca");
const maly = uprawnienia({ tytul: "umowa_o_prace", dobrowolneChorobowe: false, dniNieprzerwanegoUbezpieczeniaChorobowego: 400, ubezpieczonaWDniuPorodu: true, liczbaUbezpieczonychPlatnika: 20 }, p);
rowne("płatnik z dokładnie 20 os. — to NIE jest 'powyżej 20' => ZUS", maly.ktoWyplaca, "ZUS");

// ---- most Z-3 -> silnik (reguły uzupełniania z Załącznika ZUS, sekcja 4) ----
const z3a = wierszZ3NaMiesiac({ rok: 2026, miesiac: 4, dniPrzepracowal: 10, dniObowiazany: 20, stale: 3000, zmiennePomniejszone: 500 });
rowne("Z-3: >= połowy czasu: stałe pełne 3000 + zmienne 500/10*20 = 1000 => 4000", z3a.kwotaUzupelniona, 4000);
rowne("Z-3: 10 z 20 dni to dokładnie połowa => miesiąc NIE jest wyłączany", z3a.mniejNizPolowaCzasuPracy, false);
const z3b = wierszZ3NaMiesiac({ rok: 2026, miesiac: 5, dniPrzepracowal: 9, dniObowiazany: 20, stale: 3000 });
rowne("Z-3: 9 z 20 dni (< połowy) => miesiąc wyłączony", z3b.mniejNizPolowaCzasuPracy, true);
const z3c = wierszZ3NaMiesiac({ rok: 2026, miesiac: 6, dniPrzepracowal: 20, dniObowiazany: 20, stale: 4000, zmiennePomniejszone: 1500, premieFaktyczne: 300 });
rowne("Z-3: pełny miesiąc: bez uzupełniania => 5800", z3c.kwotaUzupelniona, 5800);

// ---- rehabilitacja, świadczenie rodzicielskie, chorobowe w ciąży ----
const reh = swiadczenieRehabilitacyjne({ podstawaMiesieczna: 3000, dni: 120 }, p);
rowne("rehab: 3 mies. @90 % (3*2700) + 1 mies. @75 % (2250)", reh.kwota, 10350.00);
const rehC = swiadczenieRehabilitacyjne({ podstawaMiesieczna: 3000, dni: 120, wCiazy: true }, p);
rowne("rehab w ciąży: 100 % przez cały okres (4 x 3000)", rehC.kwota, 12000.00);
const sr = swiadczenieRodzicielskie({ liczbaDzieci: 1, odDnia: "2027-02-20" }, p);
rowne("św. rodzicielskie 1 dz.: 52 tyg.", sr.tygodnie, 52);
rowne("św. rodzicielskie: koniec 2028-02-18 (364 dni)", sr.do, "2028-02-18");
rowne("św. rodzicielskie bliźnięta: 65 tyg.", swiadczenieRodzicielskie({ liczbaDzieci: 2, odDnia: "2027-02-01" }, p).tygodnie, 65);
const srPelne = swiadczenieRodzicielskie({ liczbaDzieci: 1, odDnia: "2027-01-01" }, p);
rowne("św. rodzicielskie od 1.01.2027, 364 dni: 11 pełnych mies. + 30/31 grudnia... (~11 967,74 zł)", srPelne.kwotaRazem, 11967.74, 1);
const chB = zasilekChorobowyWCiazy({ podstawaMiesieczna: 6000, dniNiezdolnosci: 120, pracownik: true, wiek50Plus: false }, p);
rowne("chorobowe w ciąży: 33 dni pracodawca + 87 dni ZUS, razem 120 dni * 200 zł", [chB.dniPracodawca, chB.dniZUS, chB.kwotaRazem], [33, 87, 24000]);
const ch50 = zasilekChorobowyWCiazy({ podstawaMiesieczna: 6000, dniNiezdolnosci: 120, pracownik: true, wiek50Plus: true }, p);
rowne("chorobowe w ciąży >= 50 lat: 14 dni pracodawca", ch50.dniPracodawca, 14);
const chJdg = zasilekChorobowyWCiazy({ podstawaMiesieczna: 6000, dniNiezdolnosci: 10, pracownik: false }, p);
rowne("chorobowe niepracownika: ZUS od 1. dnia", [chJdg.dniPracodawca, chJdg.dniZUS], [0, 10]);

// ---- orientacyjne netto i szybkie porównanie (policzone ręcznie) ----
// 5608,85 zł brutto: zaliczka = round(5609 * 12 % - 300) = round(373,08) = 373 zł => 5235,85 zł na rękę
rowne("netto: zaliczka PIT 12 % minus kwota zmniejszająca 300 zł", nettoMiesieczne(5608.85, p), { brutto: 5608.85, zaliczka: 373, netto: 5235.85 });
rowne("netto: niski zasiłek (1000 zł) bez zaliczki", nettoMiesieczne(1000, p)?.netto, 1000);
rowne("netto: bez sekcji podatek nie liczymy", nettoMiesieczne(5000, { ...p, podatek: undefined }), null);
rowne("podstawa z kwoty: umowa o pracę = 6500 * 0,8629", podstawaZKwoty(6500, "umowa_o_prace", p).podstawaMiesieczna, 5608.85);
rowne("podstawa z kwoty: JDG 10 000 zł zadeklarowane = 8629", podstawaZKwoty(10000, "dzialalnosc", p).podstawaMiesieczna, 8629);
rowne("podstawa z kwoty: zlecenie 3000 zł bez minimum = 2588,70", podstawaZKwoty(3000, "zlecenie", p).podstawaMiesieczna, 2588.70);
const sz = szybkiePorownanie({ podstawaMiesieczna: 5608.85, liczbaDzieci: 1 }, p);
rowne("szybkie: macierzyński 20 tyg. + rodzicielski mamy 32 tyg.", [sz.etapy[0].tygodnie, sz.etapy[1].tygodnie, sz.tygodnieRazem], [20, 32, 52]);
rowne("szybkie: miesięcznie 100 % (5608,85)", sz.etapy[0].standard.brutto, 5608.85, 0.02);
rowne("szybkie: miesięcznie 70 % (3926,20)", sz.etapy[1].standard.brutto, 3926.20, 0.02);
rowne("szybkie: miesięcznie 81,5 % (4571,21)", sz.etapy[0].usredniony.brutto, 4571.21, 0.02);
// sumy szybkiego porównania = plan silnika dla mamy biorącej macierzyński i 32 tyg. rodzicielskiego
const planMamy = (wariant: "zmienny_100_70" | "usredniony_81_5") => planZasilku({ tytul: "porod", dataZdarzenia: "2027-03-01", liczbaDzieci: 1, wariant, podstawy: { matka: 5608.85 }, rodzicielski: [{ kto: "matka", tygodnie: 32 }] }, p).sumy.razem;
rowne("szybkie = plan silnika (wariant standardowy)", sz.razem.standard, planMamy("zmienny_100_70"), 0.02);
rowne("szybkie = plan silnika (wariant uśredniony)", sz.razem.usredniony, planMamy("usredniony_81_5"), 0.02);
rowne("szybkie: bliźnięta => macierzyński 31 tyg., rodzicielski mamy 34 tyg.", szybkiePorownanie({ podstawaMiesieczna: 5000, liczbaDzieci: 2 }, p).etapy.map((e) => e.tygodnie), [31, 34]);
const zN = planZNetto(planZasilku({ tytul: "porod", dataZdarzenia: "2027-03-01", liczbaDzieci: 1, wariant: "zmienny_100_70", podstawy: { matka: 5608.85 }, rodzicielski: [] }, p), p);
// macierzyński 140 dni: brutto 26 174,63; zaliczka 373 zł/mies. * 140/30 = 1740,67 => 24 433,96
rowne("plan z netto: macierzyński 140 dni na rękę", zN.okresy[0].kwotaNetto, 24433.96, 0.02);
rowne("plan z netto: suma netto = suma okresów", zN.sumyNetto?.razem, zN.okresy[0].kwotaNetto);

await testySpraw(rowne);
testyWsparcie(rowne);
await testyRodziceUI(rowne);

console.log(`\nWYNIK: ${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
