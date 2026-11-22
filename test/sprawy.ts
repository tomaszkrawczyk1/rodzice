import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import {
  dodajDni, kwotaOkresu, planZasilku, podstawaNiepracownik, podstawaPracownik, porownajWarianty,
  terminy, zasilekChorobowyWCiazy,
} from "../src/engine/kalkulator.ts";

import type { Api } from "../src/lib/sprawy.ts";
type Rowne = (nazwa: string, got: unknown, exp: unknown, tolerancja?: number) => void;
const parametry = JSON.parse(readFileSync(new URL("../data/parametry.json", import.meta.url), "utf8"));

export async function testySpraw(rowne: Rowne) {
  // Node uruchamia testy bez konfiguracji modułów Next. Na czas importu użyj tych samych aliasów.
  const hook = registerHooks({
    resolve(specifier, context, nextResolve) {
      const sciezka = specifier.startsWith("@/") ? new URL(`../src/${specifier.slice(2)}`, import.meta.url).href : specifier;
      const lokalna = sciezka.startsWith("file:") || sciezka.startsWith(".");
      const rozszerzenie = sciezka.endsWith(".ts") || sciezka.endsWith(".json");
      return nextResolve(lokalna && !rozszerzenie ? sciezka + ".ts" : sciezka, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith("file:") && url.endsWith(".json")) {
        return { format: "module", source: `export default ${readFileSync(new URL(url), "utf8")};`, shortCircuit: true };
      }
      return nextLoad(url, context);
    },
  });
  const { sprawa, szukaj, zapytanieMaSens, bladOdpowiedzi, domyslneOdpowiedzi, zapiszOdpowiedz, aktywneOdpowiedzi, zbudujCtx, etykietaOdp } = await import("../src/lib/sprawy.ts").finally(() => hook.deregister());
  const pytania = (id: string) => sprawa(id)!.pytania;
  const pyt = (id: string, pole: string) => pytania(id).find((q) => q.id === pole)!;
  const { pln } = await import("../src/lib/format.ts");
  const chor = "zwolnienie-ciaza", wniosek = "wniosek-zasilek", urlop = "urlop-pracodawca", praca = "praca-na-urlopie";
  for (const v of ["", "-1", "271", "2,5", "1e2", "Infinity", "0x10", "2 5"]) {
    rowne(`Zwolnienie odrzuca dni: "${v}"`, !!bladOdpowiedzi(pyt(chor, "dniNiezd"), v, {}), true);
  }
  rowne("Zwolnienie przyjmuje dokładnie 270 dni", bladOdpowiedzi(pyt(chor, "dniNiezd"), "270", {}), undefined);
  rowne("Kwota z separatorem tysięcy i polskim przecinkiem", bladOdpowiedzi(pyt(chor, "brutto"), "3 450,25", {}), undefined);
  rowne("Kwota brutto musi być dodatnia", !!bladOdpowiedzi(pyt(chor, "brutto"), "0", {}), true);
  rowne("Kwota z profilu w polskim formacie", etykietaOdp(pyt(chor, "podstawaM"), "7334.65"), pln(7334.65));
  rowne("Jeden dzień z profilu ma poprawną odmianę", etykietaOdp(pyt(chor, "dniNiezd"), "1"), "1 dzień");
  for (const v of ["", "2027-02-29", "0000-01-01", "2027-13-01", "01000-01-01", "2027-04-31"]) {
    rowne(`Odrzuca datę "${v}"`, !!bladOdpowiedzi(pyt(urlop, "od"), v, {}), true);
  }
  rowne("Przyjmuje 29 lutego w roku przestępnym", bladOdpowiedzi(pyt(urlop, "od"), "2028-02-29", {}), undefined);
  rowne("Koniec urlopu przed początkiem", !!bladOdpowiedzi(pyt(urlop, "do"), "2027-06-09", { od: "2027-06-10" }), true);
  rowne("Urlop ojcowski dłuższy niż limit", !!bladOdpowiedzi(pyt(urlop, "do"), "2027-06-24", { od: "2027-06-10", rodzaj: "ojcowski" }), true);
  rowne("Urlop ojcowski kończy się przed granicą wieku", !!bladOdpowiedzi(pyt(urlop, "dziecko"), "2027-06-10", { od: "2028-06-01", do: "2028-06-14", rodzaj: "ojcowski" }), true);
  rowne("Data urodzenia po przyjęciu do rodziny", !!bladOdpowiedzi(pyt("adopcja", "dataUr"), "2027-07-01", { dataPorodu: "2027-06-20" }), true);
  rowne("33 tygodnie pracy wykraczają poza pulę przy jednym dziecku", !!bladOdpowiedzi(pyt(praca, "tygPraca"), "33", { liczbaDzieci: "1" }), true);
  rowne("34 tygodnie pracy mieszczą się w puli przy bliźniętach", bladOdpowiedzi(pyt(praca, "tygPraca"), "34", { liczbaDzieci: "2" }), undefined);

  const ctxZlecenie = { tytul: "zlecenie", dobrowolne: false, dataPorodu: "2027-06-10", liczbaDzieci: 1, podstawaM: 5000 };
  const profil = domyslneOdpowiedzi(pytania(wniosek), ctxZlecenie);
  rowne("P03 bez chorobowego nie prewypełnia pytań o kwotę ani datę", profil, { zatrudnienie: "zlecenie", chorobowe: "nie" });
  const zmieniony = zapiszOdpowiedz(pytania(wniosek), { ...profil, brutto: "4000", dataPorodu: "2027-06-10" }, pyt(wniosek, "zatrudnienie"), "umowa");
  rowne("Zmiana formy zatrudnienia usuwa zależne odpowiedzi i zachowuje datę", zmieniony, { zatrudnienie: "umowa", dataPorodu: "2027-06-10" });
  const firma = { tytul: "dzialalnosc", podstawaM: 5177.4 };
  const innyTytul = zapiszOdpowiedz(pytania(chor), { zatrudnienie: "dzialalnosc", podstawaM: "5177.4" }, pyt(chor, "zatrudnienie"), "zlecenie");
  rowne("Przy zmianie tytułu ubezpieczenia trzeba podać nową kwotę", [innyTytul.podstawaM, pyt(chor, "brutto").warunek?.(innyTytul, firma)], [undefined, true]);
  rowne("Wniosek ojcowski pomija odpowiedź o części rodzicielskiego", aktywneOdpowiedzi(pytania(urlop), { rodzaj: "ojcowski", czesc: "2" }, {}), { rodzaj: "ojcowski" });
  rowne("Persona z adopcją nie wypełnia daty porodu", domyslneOdpowiedzi(pytania("terminy"), { dataPrzyjecia: "2027-01-10" }), {});
  const f = async (url: string) => {
    if (url.startsWith("/api/zus/ezla")) throw new Error("Brak e-ZLA");
    if (url.startsWith("/api/zus/ubezpieczenie")) return { ubezpieczenie: [
      { tytul: "umowa_o_prace", chorobowe: "obowiazkowe", od: "2000-01-01", do: "2027-01-31", platnik: { nazwa: "Obecny" } },
      { tytul: "umowa_o_prace", chorobowe: "obowiazkowe", od: "9998-01-01", do: null, platnik: { nazwa: "Przyszły" } },
    ] };
    if (url === "/api/scenariusze") return { przypadki: [{ id: "P01", wejscie: { tytul: "porod", dataZdarzenia: "2027-02-15" } }] };
    return { kwotaZadluzenia: 0 };
  };
  const kontekst = await zbudujCtx(f as Api, { osoba: "Test", pesel: "0", personaId: "P01" });
  rowne("Awaria e-ZLA nie usuwa scenariusza, ubezpieczenie sprawdzamy na dzień porodu", [kontekst.dataPorodu, kontekst.wDniuPorodu, kontekst.zadluzenie], ["2027-02-15", false, 0]);
  const scenariuszAdopcji = async () => ({ przypadki: [{ id: "P07", wejscie: {
    tytul: "przysposobienie", dataZdarzenia: "2027-01-10", podstawy: { matka: 5867.72, ojciec: 7334.65 },
  } }] });
  const p07b = await zbudujCtx(scenariuszAdopcji as Api, { osoba: "Test", pesel: "0", personaId: "P07b" });
  rowne("P07b korzysta z własnej podstawy, a P07 z daty przyjęcia", [p07b.podstawaM, p07b.dataPorodu, p07b.dataPrzyjecia], [7334.65, undefined, "2027-01-10"]);

  const wywolania: [string, any][] = [];
  const api = async (url: string, raw?: unknown) => {
    const b = raw as any;
    wywolania.push([url, b]);
    switch (url) {
      case "/api/parametry": return parametry;
      case "/api/oblicz/plan": return planZasilku(b, parametry);
      case "/api/oblicz/porownanie": return porownajWarianty(b, parametry);
      case "/api/oblicz/terminy": return terminy(b.plan ? b : {
        tytul: b.wejscie.tytul, dataZdarzenia: b.wejscie.dataZdarzenia, plan: planZasilku(b.wejscie, parametry),
      }, parametry);
      case "/api/oblicz/podstawa": return b.typ === "pracownik"
        ? podstawaPracownik({ miesiace: [{ miesiac: "2026-01", kwota: b.sredniaBrutto }], pelnyWymiarEtatu: b.pelnyWymiarEtatu }, parametry)
        : podstawaNiepracownik({ miesiace: [{ miesiac: "2026-01", podstawaSkladek: b.sredniaPodstawa }], zadeklarowanaKwota: false }, parametry);
      case "/api/oblicz/chorobowe-ciaza": return zasilekChorobowyWCiazy(b, parametry);
      default: throw new Error(`Nieoczekiwane wywołanie ${url}`);
    }
  };
  const licz = (id: string, o: Record<string, string>) => sprawa(id)!.licz(o, {}, api as Api);
  const p03 = await licz(wniosek, profil);
  rowne("Brak chorobowego: brak wyliczeń i link do uprawnień", [p03.duza, p03.nastepne, wywolania.length], [undefined, ["co-przysluguje"], 0]);
  const chorobowe = await licz(chor, { zatrudnienie: "umowa", pelnyEtat: "nie", brutto: "3 450,25", dniNiezd: "23", w50: "tak", dniWykorzystane: "5", platnik: "duzy" });
  rowne("Chorobowe: część etatu, 23 dni, 9 dni wynagrodzenia i 14 dni zasiłku", [chorobowe.duza, chorobowe.szczegoly?.slice(1).map(([_, v]) => v.split(":")[0])], [pln(2282.52), ["9 dni", "14 dni"]]);

  const przyszlaData = dodajDni(new Date().toISOString().slice(0, 10), 30);
  const zam = await licz(wniosek, { dataPorodu: przyszlaData, liczbaDzieci: "2", podstawaM: "5522,56", zatrudnienie: "umowa", platnik: "nie_wiem", wariant: "nie_wiem" });
  rowne("Porównanie ZAM: suma standardowa przy bliźniętach", zam.duza, pln(70616.21));
  rowne("Porównanie ZAM: pokazuje sumę stawki uśrednionej", zam.info?.[0]?.tresc.includes(pln(68263.65)), true);
  rowne("Nieznany płatnik nie daje pewnego adresata", zam.status, "do_potwierdzenia");
  const pozny = await licz(wniosek, { dataPorodu: "2020-06-10", liczbaDzieci: "2", podstawaM: "5522.56", zatrudnienie: "umowa", platnik: "maly", wariant: "usredniony" });
  rowne("Po terminie 81,5%: kwota w standardowym wariancie i ostrzeżenie", [pozny.duza, pozny.ostrzezenia?.some((w) => w.includes("minął"))], [pln(70616.21), true]);

  // Poprawki UX: najważniejszy termin na górze, lista dokumentów, mniej pytań, kwoty „ok." bez groszy.
  rowne("ZAM: termin 81,5% jest osobno, na górze wyniku", zam.pilne?.do, dodajDni(przyszlaData, parametry.terminy_dni.wniosek_pelny_wymiar_81_5_po_porodzie));
  rowne("ZAM po terminie: brak ramki z terminem", pozny.pilne, undefined);
  rowne("ZAM: lista „Weź ze sobą” zawiera akt urodzenia i Z-3", [zam.dokumenty?.pozycje.some((x) => x.includes("aktu urodzenia")), zam.dokumenty?.pozycje.some((x) => x.includes("Z-3"))], [true, true]);
  rowne("ZAM, przyszły poród: jest zaświadczenie lekarskie", zam.dokumenty?.pozycje.some((x) => x.includes("Zaświadczenie lekarskie")), true);
  rowne("ZAM: kwota miesięczna „ok.” bez groszy", /ok\. [\d\s]+zł miesięcznie/.test(zam.podpis ?? ""), true);
  rowne("ZAM nie pyta o wariant wypłaty (zawsze porównanie)", pytania(wniosek).some((q) => q.id === "wariant"), false);
  const pPlat = pyt(wniosek, "platnik");
  rowne("ZAM pyta o wielkość firmy tylko, gdy ZUS ma ją w profilu", [pPlat.warunek?.({ zatrudnienie: "umowa" }, {}), pPlat.warunek?.({ zatrudnienie: "umowa" }, { liczbaUbezpieczonychPlatnika: 30 })], [false, true]);
  const zdzialalnosc = await licz(wniosek, { dataPorodu: przyszlaData, liczbaDzieci: "1", podstawaM: "5000", zatrudnienie: "dzialalnosc", chorobowe: "tak" });
  rowne("Działalność: bez zaświadczenia płatnika, wniosek do ZUS", [zdzialalnosc.dokumenty?.pozycje.some((x) => x.includes("Z-3")), zdzialalnosc.zrob[0].tekst.includes("w ZUS")], [false, true]);

  const p4 = await licz(urlop, { rodzaj: "uzupelniajacy", od: "2027-06-15", do: "2027-06-28", dziecko: "2027-01-02", imie: "Jan Testowy", pracodawca: "Firma testowa" });
  rowne("Uzupełniający: poprawny nagłówek i termin od końca macierzyńskiego", [p4.glowne.includes("o uzupełniający urlop macierzyński"), p4.terminy?.[0]?.do], [true, "2027-05-24"]);
  const p5 = await licz("podzial-urlopu", { dataPorodu: "2027-06-10", liczbaDzieci: "3", podstawaM: "5522.56", zatrudnienieO: "dzialalnosc", bruttoO: "7800", ojcowski: "tak", odOjcowski: "2027-07-02" });
  rowne("Podział: ojcowski od wybranej daty, własna firma drugiego rodzica", [p5.duza, p5.terminy?.find((t) => /ojcowski/.test(t.co))?.do], [pln(88596.48), "2027-06-25"]);
  const p6 = await licz(praca, { dataPorodu: "2027-06-10", liczbaDzieci: "2", podstawaM: "5522.56", tygPraca: "34", etat: "0.5" });
  rowne("Praca z bliźniętami: pełne 34 tygodnie puli", p6.glowne.includes("34 tygodnie"), true);
  const p7 = await licz("adopcja", { rodzajAdopcji: "rodzina_zastepcza", dataPorodu: "2027-06-10", dataUr: "2019-06-10", odroczenie: "nie" });
  rowne("Adopcja: przekroczony limit wieku bez pozornej kwoty", [p7.status, p7.duza], ["do_potwierdzenia", undefined]);
  const p7b = await licz("adopcja", { rodzajAdopcji: "rodzina_zastepcza", dataPorodu: "2027-06-10", dataUr: "2019-06-10", odroczenie: "tak", liczbaDzieci: "1", podstawaM: "5522.56" });
  rowne("Odroczenie szkoły zmienia granicę i daje wyliczenie", p7b.duza, pln(54637.24));
  const p7c = await licz("adopcja", { rodzajAdopcji: "rodzina_zastepcza", dataPorodu: "2027-01-10", dataUr: "2020-01-11", odroczenie: "nie", liczbaDzieci: "1", podstawaM: "5867.72" });
  rowne("Przyjęcie dzień przed limitem wieku: 9 tygodni na warunkach macierzyńskiego i 29 rodzicielskiego", p7c.duza, pln(40114.90));
  const p9 = await licz("terminy", { rodzajZdarzenia: "przysposobienie", dataPrzyjecia: "2027-06-10", znaKoniec: "tak", koniec: "2028-02-29" });
  rowne("Terminy adopcji liczą przedawnienie od podanego końca", p9.terminy?.map((t) => t.do), ["2027-06-17", "2027-07-01", "2027-07-01", "2028-08-29"]);
  const p9b = await licz("terminy", { rodzajZdarzenia: "porod", dataPorodu: "2027-06-10", znaKoniec: "nie" });
  rowne("Nieznany koniec okresu nie tworzy fikcyjnego terminu przedawnienia", p9b.terminy?.length, 1);

  rowne("Kwota dzienna macierzyńskiego ma dwa miejsca po przecinku", kwotaOkresu(5608.85, 100, 140, 1, false, parametry).kwotaDzienna, 186.96);
  rowne("Kwota za okres = stawka dzienna zaokrąglona do grosza × dni (jak w ZUS)", kwotaOkresu(5608.85, 100, 140, 1, false, parametry).kwota, 26174.40);

  const frazy: [string, string | null][] = [
    ["czy dostanę zasiłek bez ubezpieczenia","co-przysluguje"],
    ["umowa zlecenie bez chorobowego","co-przysluguje"],
    ["samozatrudniona dług w zus","co-przysluguje"],
    ["okres wyczekiwnia","co-przysluguje"],
    ["l4 w ciazy","zwolnienie-ciaza"],
    ["zwolniene ciazowe","zwolnienie-ciaza"],
    ["ile kasy na chorobowym w ciąży","zwolnienie-ciaza"],
    ["e-zla kod b","zwolnienie-ciaza"],
    ["ile dostanę po porodzie","wniosek-zasilek"],
    ["wniosek ZAM","wniosek-zasilek"],
    ["maciezynski 81,5","wniosek-zasilek"],
    ["papier na macierzyński do szefa","urlop-pracodawca"],
    ["szef nie chce dać urlopu","urlop-pracodawca"],
    ["wniosek o ojcowski","urlop-pracodawca"],
    ["pismo do kadr o urlop","urlop-pracodawca"],
    ["mąż chce wziąć urlop","podzial-urlopu"],
    ["jak podzielc rodzicielski","podzial-urlopu"],
    ["9 tygodni dla taty","podzial-urlopu"],
    ["praca na pół etatu na rodzicielskim","praca-na-urlopie"],
    ["dorabiac na rodzicielskim","praca-na-urlopie"],
    ["łącznie urlopu z pracą","praca-na-urlopie"],
    ["adopcja","adopcja"],
    ["rodzina zastepcza","adopcja"],
    ["przysposobene dziecka","adopcja"],
    ["poroniłam","trudna-sytuacja"],
    ["wczesniak w szptalu","trudna-sytuacja"],
    ["ile mam czasu na złożenie wniosku","terminy"],
    ["przedawnienie zasiłku","terminy"],
    ["skrucony akt urodzena","odpis-aktu"],
    ["pogoda jutro w Łodzi",null],
  ];
  for (const [fraza, id] of frazy) {
    rowne(`Wyszukiwarka: ${fraza}`, szukaj(fraza, []).sprawy[0]?.id ?? null, id);
  }

  // Pytania i odpowiedzi: przy odmowie pracodawcy ma wyjść pytanie, w którym o odmowie mowa, a nie pierwsze z listy sprawy.
  const faq = JSON.parse(readFileSync(new URL("../src/content/poradnik/faq.json", import.meta.url), "utf8")).pytania;
  const idFaq = (fraza: string) => szukaj(fraza, faq).faq.map((f: { id: string }) => f.id);
  for (const fraza of ["szef nie chce dać urlopu", "pracodawca odmawia urlopu", "szefowa nie zgadza się na urlop", "kadry odmówiły urlopu rodzicielskiego"]) {
    rowne(`Wyszukiwarka, odmowa pracodawcy: ${fraza}`, [szukaj(fraza, faq).sprawy[0]?.id, idFaq(fraza)], ["urlop-pracodawca", ["F13"]]);
  }
  rowne("Szef bez odmowy: nadal pytania powiązane ze sprawą", idFaq("szef urlop wniosek"), ["F12", "F14"]);
  rowne("Odmowa bez wzmianki o pracodawcy nie zmienia trafień", szukaj("odmowa", faq).sprawy.length, 0);
  rowne("Zwykłe zapytanie bez zmian (mąż chce wziąć urlop)", idFaq("mąż chce wziąć urlop"), ["F12", "F11"]);
  rowne("HTML w zapytaniu: brak wyników", [szukaj("<b>x</b>", faq).sprawy.length, szukaj("<b>x</b>", faq).faq.length], [0, 0]);
  rowne("zapytanieMaSens: <b>x</b>", zapytanieMaSens("<b>x</b>"), false);
  rowne("zapytanieMaSens: puste i same spacje", [zapytanieMaSens(""), zapytanieMaSens("   ")], [false, false]);
  rowne("zapytanieMaSens: zwykła fraza", zapytanieMaSens("urlop ojcowski"), true);
}
