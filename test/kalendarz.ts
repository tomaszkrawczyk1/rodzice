// Uruchom: node --experimental-strip-types test/kalendarz.ts   (Node 22+)
// UWAGA: poniższe wpisy to FIKCYJNE dane testowe mechaniki (daty, sortowanie, przeliczanie po porodzie),
// NIE treść medyczna. Prawdziwe terminy i badania trafiają do ../data/kalendarz_medyczny.json.
import { readFileSync } from "node:fs";
import { kalendarz, tcNaDni, terminyKalendarza, type BazaKalendarza } from "../src/lib/kalendarz.ts";

let ok = 0, fail = 0;
function rowne(nazwa: string, got: unknown, exp: unknown) {
  if (JSON.stringify(got) === JSON.stringify(exp)) ok++;
  else { fail++; console.log(`FAIL  ${nazwa}\n   oczekiwano: ${JSON.stringify(exp)}\n   jest:       ${JSON.stringify(got)}`); }
}
function rzuca(nazwa: string, f: () => unknown) {
  try { f(); fail++; console.log(`FAIL  ${nazwa} (brak wyjątku)`); } catch { ok++; }
}

const baza: BazaKalendarza = {
  wersja: "test",
  wydarzenia: [
    { id: "T-PO-1", nazwa: "po 1", grupa: "po_porodzie", kategoria: "x", trymestr: "polog", okno: { typ: "po_porodzie", jednostka: "dni", od: 1, do: 3 }, zrodlo: "test" },
    { id: "T-PRZED-2", nazwa: "przed 2", grupa: "przed_porodem", kategoria: "x", trymestr: 2, okno: { typ: "tc", od: "21+0", do: "26+6" }, zrodlo: "test", status: "do_potwierdzenia" },
    { id: "T-PRZED-1", nazwa: "przed 1", grupa: "przed_porodem", kategoria: "x", trymestr: 1, okno: { typ: "tc", od: "11+0", do: "14+6" }, zrodlo: "test" },
    { id: "T-DO-PORODU", nazwa: "do porodu", grupa: "przed_porodem", kategoria: "x", okno: { typ: "tc", od: "36+0", do: "porod" }, zrodlo: "test" },
    { id: "T-MIES", nazwa: "miesiące", grupa: "po_porodzie", kategoria: "x", okno: { typ: "po_porodzie", jednostka: "miesiace", od: 2, do: 3 }, zrodlo: "test" },
    { id: "T-TYG", nazwa: "tygodnie", grupa: "po_porodzie", kategoria: "x", okno: { typ: "po_porodzie", jednostka: "tygodnie", od: 6, do: 6 }, zrodlo: "test" },
  ],
};

rowne("tc 11+0", tcNaDni("11+0"), 77);
rowne("tc 40+0", tcNaDni("40+0"), 280);
rowne("tc 14+6", tcNaDni("14+6"), 104);
rzuca("tc zły zapis", () => tcNaDni("11"));
rzuca("tc dni > 6", () => tcNaDni("11+7"));

// TP Anny (persona P01): 15.03.2027 -> początek ciąży 280 dni wcześniej = 2026-06-08
const w = kalendarz({ terminPorodu: "2027-03-15" }, baza);
rowne("początek ciąży", w.poczatekCiazy, "2026-06-08");
const by = Object.fromEntries(w.oś.map(e => [e.id, e]));
rowne("11+0 .. 14+6", [by["T-PRZED-1"].od, by["T-PRZED-1"].do], ["2026-08-24", "2026-09-20"]);
rowne("21+0 .. 26+6", [by["T-PRZED-2"].od, by["T-PRZED-2"].do], ["2026-11-02", "2026-12-13"]);
rowne("36+0 .. porod = TP", [by["T-DO-PORODU"].od, by["T-DO-PORODU"].do], ["2027-02-15", "2027-03-15"]);
rowne("kolejność chronologiczna", w.oś.map(e => e.id), ["T-PRZED-1", "T-PRZED-2", "T-DO-PORODU", "T-PO-1", "T-TYG", "T-MIES"]);
rowne("po porodzie od TP: dni", [by["T-PO-1"].od, by["T-PO-1"].do], ["2027-03-16", "2027-03-18"]);
rowne("po porodzie od TP: tygodnie", by["T-TYG"].od, "2027-04-26");
rowne("po porodzie od TP: miesiące", [by["T-MIES"].od, by["T-MIES"].do], ["2027-05-15", "2027-06-15"]);
rowne("po porodzie szacunkowe bez daty porodu", by["T-PO-1"].szacunkowe, true);
rowne("przed porodem nie jest 'szacunkowe'", by["T-PRZED-1"].szacunkowe, false);
rowne("status do_potwierdzenia przechodzi", by["T-PRZED-2"].status, "do_potwierdzenia");
rowne("ostrzeżenia: orientacyjne + do potwierdzenia + bez trymestru", w.ostrzezenia.length, 3);

// Trymestry: grupowanie wg pola z danych; wpisy bez trymestru osobno
rowne("wgTrymestrow: kolejność grup", w.wgTrymestrow.map(g => g.trymestr), [1, 2, "polog"]);
rowne("wgTrymestrow: zawartość 1", w.wgTrymestrow[0].wydarzenia.map(e => e.id), ["T-PRZED-1"]);
rowne("bezTrymestru", w.bezTrymestru.map(e => e.id).sort(), ["T-DO-PORODU", "T-MIES", "T-TYG"]);
rowne("ostrzeżenie o pozycjach bez trymestru", w.ostrzezenia.some(o => o.includes("bez przypisanego trymestru")), true);
rzuca("polog dla grupy przed_porodem", () => kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", wydarzenia: [{ ...baza.wydarzenia[1], trymestr: "polog" }] }));
rzuca("trymestr 4", () => kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", wydarzenia: [{ ...baza.wydarzenia[1], trymestr: 4 as any }] }));

// Poród 2 tygodnie wcześniej (01.03.2027) -> przeliczenie części poporodowej, brak ostrzeżenia o szacunku
const w2 = kalendarz({ terminPorodu: "2027-03-15", dataPorodu: "2027-03-01" }, baza);
const by2 = Object.fromEntries(w2.oś.map(e => [e.id, e]));
rowne("rzeczywisty poród: dni", [by2["T-PO-1"].od, by2["T-PO-1"].do], ["2027-03-02", "2027-03-04"]);
rowne("rzeczywisty poród: nie szacunkowe", by2["T-PO-1"].szacunkowe, false);
rowne("rzeczywisty poród: 'do porodu' kończy się w dniu porodu", by2["T-DO-PORODU"].do, "2027-03-01");
rowne("rzeczywisty poród: brak ostrzeżenia o szacunku", w2.ostrzezenia.some(o => o.includes("orientacyjne")), false);

// Walidacja
rzuca("zła data TP", () => kalendarz({ terminPorodu: "15.03.2027" }, baza));
rzuca("brak źródła", () => kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", wydarzenia: [{ ...baza.wydarzenia[0], zrodlo: "" }] }));
rzuca("duplikat id", () => kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", wydarzenia: [baza.wydarzenia[0], baza.wydarzenia[0]] }));
rzuca("okno od>do", () => kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", wydarzenia: [{ ...baza.wydarzenia[0], okno: { typ: "po_porodzie", jednostka: "dni", od: 5, do: 1 } }] }));

// Poród przed oknem: wpis „przed porodem” zaczynający się po porodzie znika, a okno trwające w dniu porodu jest przycięte
const w3 = kalendarz({ terminPorodu: "2027-03-15", dataPorodu: "2027-02-20" }, baza);
rowne("poród 20.02: wpis 36+0 (15.02) przycięty do dnia porodu", w3.oś.find(e => e.id === "T-DO-PORODU")?.do, "2027-02-20");
const w4 = kalendarz({ terminPorodu: "2027-03-15", dataPorodu: "2027-02-01" }, baza);
rowne("poród 01.02: wpis zaczynający się po porodzie pominięty", w4.oś.some(e => e.id === "T-DO-PORODU"), false);
rzuca("warunkowe bez warunku", () => kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", wydarzenia: [{ ...baza.wydarzenia[1], typ: "warunkowe" }] }));
rowne("najpozniej -> data", kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", wydarzenia: [{ ...baza.wydarzenia[2], okno: { typ: "tc", od: "0+0", do: "10+0", najpozniej: "12+0" } }] }).oś[0].najpozniej, "2026-08-31");

// ---- Prawdziwa baza (treść od zespołu) ----
const prawdziwa = JSON.parse(readFileSync(new URL("../data/kalendarz_medyczny.json", import.meta.url), "utf8"));
const wszystkieWarunki: string[] = prawdziwa.warunki.map((x: { id: string }) => x.id);
const wr = kalendarz({ terminPorodu: "2027-03-15", warunki: wszystkieWarunki }, prawdziwa);
const r = Object.fromEntries(wr.oś.map(e => [e.id, e]));
rowne("prawdziwa: każdy wpis ma trymestr", wr.bezTrymestru.length, 0);
rowne("prawdziwa: etapy w kolejności", wr.wgTrymestrow.map(g => g.trymestr), [1, 2, 3, "polog", "niemowle"]);
rowne("prawdziwa: nazwy etapów po ludzku", wr.wgTrymestrow.map(g => g.nazwa), ["I trymestr", "II trymestr", "III trymestr", "Po porodzie: mama i noworodek", "Pierwszy rok życia dziecka"]);
rowne("prawdziwa: standard w II trymestrze", wr.oś.filter(e => e.trymestr === 2 && e.typ === "standard").map(e => e.id).sort(), ["BP-02", "GLU-02", "LAB-01", "SZK-01", "USG-03", "WIZ-03"]);
rowne("prawdziwa: wizyty cykliczne mają częstotliwość", [r["WIZ-02"].czestotliwosc, r["WIZ-03"].czestotliwosc], ["co ok. 4 tygodnie", "co ok. 4 tygodnie"]);
rowne("prawdziwa: wizyty kontrolne I tr. 0–13+6", [r["WIZ-02"].od, r["WIZ-02"].do], ["2026-06-08", "2026-09-13"]);
rowne("prawdziwa: wizyty kontrolne II tr. 14–27+6", [r["WIZ-03"].od, r["WIZ-03"].do], ["2026-09-14", "2026-12-20"]);
rowne("prawdziwa: USG połówkowe 18–22 tc", [r["USG-03"].od, r["USG-03"].do], ["2026-10-12", "2026-11-15"]);
rowne("prawdziwa: OGTT 24–28 tc", [r["GLU-02"].od, r["GLU-02"].do], ["2026-11-23", "2026-12-27"]);
rowne("prawdziwa: szkoła rodzenia od 21 tc do porodu", [r["SZK-01"].od, r["SZK-01"].do], ["2026-11-02", "2027-03-15"]);
rowne("prawdziwa: anty-D 24–28 tc i konsultacja do porodu są warunkowe", [r["ANTD-01"].typ, r["KON-01"].typ, r["ANTD-01"].od, r["KON-01"].do], ["warunkowe", "warunkowe", "2026-11-23", "2027-03-15"]);
rowne("prawdziwa: toksoplazmoza pozostaje warunkowa", r["TOX-01"].typ, "warunkowe");
rowne("prawdziwa: brak sekcji _poczekalnia", "_poczekalnia" in prawdziwa, false);
rowne("prawdziwa: pierwsza wizyta do 10 tc, bez daty najpóźniej", [r["WIZ-01"].do, r["WIZ-01"].najpozniej], ["2026-08-17", undefined]);
rowne("prawdziwa: USG genetyczne 11+0–13+6", [r["USG-02"].od, r["USG-02"].do], ["2026-08-24", "2026-09-13"]);
rowne("prawdziwa: toksoplazmoza 21–26 tc", [r["TOX-01"].od, r["TOX-01"].do], ["2026-11-02", "2026-12-13"]);
rowne("prawdziwa: warunkowe mają listę warunków", wr.oś.filter(e => e.typ === "warunkowe").every(e => !!e.warunki?.length), true);
rowne("prawdziwa: KAŻDY wpis ma 'skutek' (co jeśli pominiesz)", wr.oś.filter(e => !e.skutek).map(e => e.id), []);
rowne("prawdziwa: każdy wpis ma opis", wr.oś.filter(e => !e.opis).map(e => e.id), []);
rowne("prawdziwa: informacje wczytane (wszystkie warunki)", wr.informacje.length, 16);
rowne("prawdziwa: sytuacje szczególne", wr.informacje.filter(i => i.rodzaj === "sytuacja_szczegolna").map(i => i.id), ["SYT-CUK-PRZED", "SYT-GDM", "SYT-NADCISN", "SYT-AUTOIMM", "SYT-ZUM", "SYT-SWIAD", "SYT-MNOGA", "SYT-OGOLNE"]);
rowne("prawdziwa: każda informacja ma rodzaj", wr.informacje.every(i => !!i.rodzaj), true);
// ---- III trymestr (TP 2027-03-15) ----
rowne("III: wizyty do 32 tc", [r["WIZ-04"].od, r["WIZ-04"].do, r["WIZ-04"].czestotliwosc], ["2026-12-21", "2027-01-24", "co 4 tygodnie"]);
rowne("III: wizyty 33–36 tc", [r["WIZ-05"].od, r["WIZ-05"].do, r["WIZ-05"].czestotliwosc], ["2027-01-25", "2027-02-21", "co 2–3 tygodnie"]);
rowne("III: wizyty po 36 tc (od 37+0 do porodu)", [r["WIZ-06"].od, r["WIZ-06"].do, r["WIZ-06"].czestotliwosc], ["2027-02-22", "2027-03-15", "zwykle co 1–2 tygodnie (po 40. tygodniu co 7 dni)"]);
rowne("III: badania 33–37 tc", [r["LAB-03"].od, r["LAB-03"].do, r["LAB-03"].pozycje?.length], ["2027-01-25", "2027-02-28", 4]);
rowne("III: GBS 35–37 tc", [r["GBS-01"].od, r["GBS-01"].do], ["2027-02-08", "2027-02-28"]);
rowne("III: USG 28–32 tc", [r["USG-04"].od, r["USG-04"].do], ["2026-12-21", "2027-01-24"]);
rowne("III: KTG warunkowe od 32 tc do porodu", [r["KTG-01"].typ, r["KTG-01"].od, r["KTG-01"].do], ["warunkowe", "2027-01-18", "2027-03-15"]);
rowne("III: po terminie: USG i kontrole od 40+0", [r["USG-05"].od, r["WIZ-07"].od, r["WIZ-07"].czestotliwosc], ["2027-03-15", "2027-03-15", "co 7 dni (przy nieprawidłowościach częściej)"]);

// ---- po porodzie (TP 2027-03-15, poród w terminie, wypis założony +3 dni) ----
rowne("wypis założony", [wr.wypis.data, wr.wypis.zalozony], ["2027-03-18", true]);
rowne("połóg: wizyta położnej do 48 h po wypisie", [r["PAT-01"].od, r["PAT-01"].do, r["PAT-01"].szacunkowe], ["2027-03-18", "2027-03-20", true]);
rowne("noworodek: WZW B w ciągu 24 h", [r["NOW-01"].od, r["NOW-01"].do], ["2027-03-15", "2027-03-16"]);
rowne("noworodek: BCG do wypisu", [r["NOW-02"].od, r["NOW-02"].do], ["2027-03-15", "2027-03-18"]);
rowne("noworodek: wizyta u lekarza w ciągu 4 tygodni", [r["PED-01"].od, r["PED-01"].do], ["2027-03-15", "2027-04-12"]);
rowne("mama: depresja poporodowa w 4. tygodniu (3–5 tyg., bez ostatniego dnia)", [r["DEP-01"].od, r["DEP-01"].do, r["DEP-01"].dla], ["2027-04-05", "2027-04-18", "matka"]);
rowne("mama: badanie poporodowe 6 tyg", [r["POP-01"].od, r["POP-01"].do], ["2027-04-26", "2027-04-26"]);
rowne("bilans 1: 6.–9. tydzień", [r["BIL-01"].od, r["BIL-01"].do], ["2027-04-26", "2027-05-23"]);
rowne("bilans 2: 3.–4. miesiąc", [r["BIL-02"].od, r["BIL-02"].do], ["2027-06-15", "2027-08-14"]);
rowne("bilans 3: 5.–7. miesiąc", [r["BIL-03"].od, r["BIL-03"].do], ["2027-08-15", "2027-10-14"]);
rowne("bilans 4: 9. miesiąc", [r["BIL-04"].od, r["BIL-04"].do], ["2027-12-15", "2028-01-14"]);
rowne("bilans 5: 12. miesiąc", [r["BIL-05"].od, r["BIL-05"].do], ["2028-03-15", "2028-04-14"]);
rowne("bilanse 1–3 mają szczepienie, 4–5 nie", ["BIL-01", "BIL-02", "BIL-03", "BIL-04", "BIL-05"].map(id => r[id].pozycje!.some(p => p.startsWith("Szczepienie"))), [true, true, true, false, false]);
rowne("bilanse i niemowlę oznaczone jako dla dziecka", wr.oś.filter(e => e.trymestr === "niemowle").every(e => e.dla === "dziecko"), true);

// ---- rzeczywisty poród przed terminem + znana data wypisu ----
const wp = kalendarz({ terminPorodu: "2027-03-15", dataPorodu: "2027-03-08", dataWypisu: "2027-03-11" }, prawdziwa);
const rp = Object.fromEntries(wp.oś.map(e => [e.id, e]));
rowne("poród 08.03: wizyty po 36 tc przycięte do dnia porodu", rp["WIZ-06"].do, "2027-03-08");
rowne("poród 08.03: USG po terminie i kontrole pominięte", [wp.oś.some(e => e.id === "USG-05"), wp.oś.some(e => e.id === "WIZ-07")], [false, false]);
rowne("poród 08.03: wizyta położnej od wypisu 11.03", [rp["PAT-01"].od, rp["PAT-01"].do, rp["PAT-01"].szacunkowe], ["2027-03-11", "2027-03-13", false]);
rowne("poród 08.03: BCG do wypisu 11.03", rp["NOW-02"].do, "2027-03-11");
rowne("poród 08.03: bilans 1 liczony od porodu", rp["BIL-01"].od, "2027-04-19");
rowne("poród 08.03: brak ostrzeżeń o szacunku", wp.ostrzezenia.some(o => o.includes("orientacyjne") || o.includes("wypisu")), false);
const wz = kalendarz({ terminPorodu: "2027-03-15", dataPorodu: "2027-03-08" }, prawdziwa);
rowne("poród bez daty wypisu: ostrzeżenie o założonym wypisie", wz.ostrzezenia.some(o => o.includes("wypisu")), true);
rzuca("wypis przed porodem", () => kalendarz({ terminPorodu: "2027-03-15", dataPorodu: "2027-03-08", dataWypisu: "2027-03-07" }, prawdziwa));
rzuca("niemowle dla grupy przed_porodem", () => kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", wydarzenia: [{ ...baza.wydarzenia[1], trymestr: "niemowle" }] }));

// ---- warunki (checkboxy): bez zaznaczenia nic warunkowego nie wychodzi ----
const w0 = kalendarz({ terminPorodu: "2027-03-15" }, prawdziwa);
rowne("bez zaznaczeń: żadnych wpisów warunkowych", w0.oś.filter(e => e.typ === "warunkowe").map(e => e.id), []);
rowne("bez zaznaczeń: brak sytuacji szczególnych ani porad warunkowych", w0.informacje.filter(i => i.warunki?.length).map(i => i.id), []);
rowne("bez zaznaczeń: standardowe wpisy są (liczba)", w0.oś.length, wr.oś.filter(e => e.typ === "standard").length);
const wc = kalendarz({ terminPorodu: "2027-03-15", warunki: ["cukrzyca_przed"] }, prawdziwa);
rowne("cukrzyca przed ciążą: okulista w 3 trymestrach + KTG", wc.oś.filter(e => e.typ === "warunkowe").map(e => e.id).sort(), ["KTG-01", "OKU-01", "OKU-02", "OKU-03"]);
rowne("cukrzyca przed ciążą: sytuacje szczególne", wc.informacje.filter(i => i.rodzaj === "sytuacja_szczegolna").map(i => i.id).sort(), ["SYT-CUK-PRZED", "SYT-OGOLNE"]);
const wt = kalendarz({ terminPorodu: "2027-03-15", warunki: ["toxo_ujemna", "rh_ujemne"] }, prawdziwa);
rowne("toksoplazmoza ujemna + Rh−: TOX i ANTD, bez reszty", wt.oś.filter(e => e.typ === "warunkowe").map(e => e.id).sort(), ["ANTD-01", "TOX-01"]);
rowne("toksoplazmoza ujemna: porada o profilaktyce, ale nie 'sytuacja szczególna'", wt.informacje.filter(i => i.warunki?.length).map(i => i.id), ["INF-TOX"]);
const wg = kalendarz({ terminPorodu: "2027-03-15", warunki: ["ryzyko_cukrzycy"] }, prawdziwa);
rowne("ryzyko cukrzycy ciążowej: wcześniejszy test", wg.oś.some(e => e.id === "GLU-01"), true);
rowne("test cukru 24–28 tc jest dla wszystkich", [w0.oś.some(e => e.id === "GLU-02"), wg.oś.some(e => e.id === "GLU-02")], [true, true]);

// ---- nowe wydarzenia v9 (TP 15.03.2027) ----
rowne("baza v9: 46 wydarzeń, 14 warunków, 16 informacji", [prawdziwa.wydarzenia.length, prawdziwa.warunki.length, prawdziwa.informacje.length], [46, 14, 16]);
rowne("WIZ-01 w danych nie ma pola najpozniej", "najpozniej" in prawdziwa.wydarzenia.find((e: { id: string }) => e.id === "WIZ-01").okno, false);
rowne("prawdziwa: brak ostrzeżenia o niepotwierdzonych pozycjach", wr.ostrzezenia.filter(o => o.includes("do potwierdzenia")), []);
rowne("prawdziwa: żaden wpis na osi nie jest do_potwierdzenia", wr.oś.filter(e => e.status !== "ok").map(e => e.id), []);
rowne("LAB-01: krew i mocz 15–20 tc", [r["LAB-01"].od, r["LAB-01"].do, r["LAB-01"].trymestr, r["LAB-01"].typ], ["2026-09-21", "2026-11-01", 2, "standard"]);
rowne("LAB-02: krew i mocz 27–32 tc", [r["LAB-02"].od, r["LAB-02"].do, r["LAB-02"].trymestr], ["2026-12-14", "2027-01-24", 3]);
rowne("LAB-04: krew i mocz 38–39 tc", [r["LAB-04"].od, r["LAB-04"].do, r["LAB-04"].trymestr], ["2027-03-01", "2027-03-14", 3]);
rowne("BP-02: test potrójny 14–20 tc", [r["BP-02"].od, r["BP-02"].do, r["BP-02"].typ, r["BP-02"].trymestr], ["2026-09-14", "2026-11-01", "standard", 2]);
rowne("KTG-02: po terminie dla wszystkich, bez częstotliwości w danych", [r["KTG-02"].typ, r["KTG-02"].od, r["KTG-02"].do, r["KTG-02"].czestotliwosc ?? null, w0.oś.some(e => e.id === "KTG-02")], ["standard", "2027-03-15", "2027-03-15", null, true]);
rowne("KTG-01: częstotliwość jest, gdy pole istnieje", r["KTG-01"].czestotliwosc, "zwykle raz w tygodniu lub częściej");
rowne("PAT-02: patronaż w 1. roku, nie w połogu", [r["PAT-02"].trymestr, r["PAT-02"].kategoria, r["PAT-02"].dla, r["PAT-02"].od, r["PAT-02"].do], ["niemowle", "wizyta_patronazowa", "dziecko", "2027-06-15", "2027-08-14"]);
rowne("grupowanie: ta sama kategoria patronażu w połogu i w 1. roku", [
  wr.wgTrymestrow.find(g => g.trymestr === "polog")!.wydarzenia.filter(e => e.kategoria === "wizyta_patronazowa").map(e => e.id).sort(),
  wr.wgTrymestrow.find(g => g.trymestr === "niemowle")!.wydarzenia.filter(e => e.kategoria === "wizyta_patronazowa").map(e => e.id),
], [["PAT-01", "PED-01"], ["PAT-02"]]);
rowne("INF-USG: informacja ogólna, także bez zaznaczeń", [wr.informacje.find(i => i.id === "INF-USG")?.rodzaj, w0.informacje.some(i => i.id === "INF-USG")], ["ogolna", true]);
const wgdm = kalendarz({ terminPorodu: "2027-03-15", warunki: ["cukrzyca_ciazowa"] }, prawdziwa);
const glu3 = wgdm.oś.find(e => e.id === "GLU-03");
rowne("GLU-03: test po cukrzycy ciążowej, 6–12 tyg.", glu3 && [glu3.od, glu3.do, glu3.typ, glu3.dla, glu3.trymestr], ["2027-04-26", "2027-06-07", "warunkowe", "matka", "polog"]);
rowne("bez cukrzycy ciążowej: brak GLU-03", w0.oś.some(e => e.id === "GLU-03"), false);
rowne("warunek znieczulenie jest na liście z bazy", prawdziwa.warunki.some((w: { id: string }) => w.id === "znieczulenie"), true);
const wa = kalendarz({ terminPorodu: "2027-03-15", warunki: ["znieczulenie"] }, prawdziwa);
rowne("znieczulenie: tylko konsultacja anestezjologiczna", wa.oś.filter(e => e.typ === "warunkowe").map(e => e.id), ["ANE-01"]);
rowne("ANE-01: 33–37 tc", [r["ANE-01"].od, r["ANE-01"].do, r["ANE-01"].warunki], ["2027-01-25", "2027-02-28", ["znieczulenie"]]);
rowne("bez znieczulenia: brak ANE-01", w0.oś.some(e => e.id === "ANE-01"), false);
rzuca("nieznany warunek w wejściu", () => kalendarz({ terminPorodu: "2027-03-15", warunki: ["nie_ma_takiego"] }, prawdziwa));
rzuca("nieznany warunek w danych", () => kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", warunki: [], wydarzenia: [{ ...baza.wydarzenia[1], typ: "warunkowe", warunki: ["x"] }] }));
rowne("warunek odblokowuje wpis z fixture", kalendarz({ terminPorodu: "2027-03-15", warunki: ["a"] }, { wersja: "t", warunki: [{ id: "a", etykieta: "A" }], wydarzenia: [{ ...baza.wydarzenia[1], typ: "warunkowe", warunki: ["a"] }] }).oś.length, 1);
rowne("brak zaznaczenia ukrywa wpis z fixture", kalendarz({ terminPorodu: "2027-03-15" }, { wersja: "t", warunki: [{ id: "a", etykieta: "A" }], wydarzenia: [{ ...baza.wydarzenia[1], typ: "warunkowe", warunki: ["a"] }] }).oś.length, 0);

const tekst = JSON.stringify(prawdziwa).toLowerCase();
rowne("prawdziwa: brak nazw leków (insulin, spiramycyn, immunoglobulin, cart)", ["insulin", "spiramycyn", "immunoglobulin", "cart"].filter(s => tekst.includes(s)), []);

// Walidacja importowanej bazy i powiązanie osi z terminami ZUS.
rzuca("nieistniejąca data", () => kalendarz({ terminPorodu: "2027-02-29" }, baza));
rzuca("duplikat id warunku", () => kalendarz({ terminPorodu: "2027-03-15" }, {
  ...baza, warunki: [{ id: "a", etykieta: "A" }, { id: "a", etykieta: "B" }],
}));
rzuca("nieznany warunek w informacji", () => kalendarz({ terminPorodu: "2027-03-15" }, {
  ...baza, informacje: [{ id: "i", temat: "I", tresc: [], zrodlo: "test", warunki: ["x"] }],
}));
rzuca("źródło informacji zawiera tylko spacje", () => kalendarz({ terminPorodu: "2027-03-15" }, {
  ...baza, informacje: [{ id: "i", temat: "I", tresc: [], zrodlo: " " }],
}));
const parametry = JSON.parse(readFileSync(new URL("../data/parametry.json", import.meta.url), "utf8"));
const scenariusze = JSON.parse(readFileSync(new URL("../data/scenariusze.json", import.meta.url), "utf8"));
const planAnny = scenariusze.przypadki.find((p: { id: string }) => p.id === "P01").wejscie;
const zus = terminyKalendarza({ terminPorodu: "2027-03-15" }, parametry, planAnny);
rowne("ZUS: wniosek od terminu porodu i wnioski z planu", [zus.wniosek, zus.doPracodawcy.map(t => t.do)],
  ["2027-04-05", ["2027-07-12", "2028-02-21"]]);
const zusPoPorodzie = terminyKalendarza({ terminPorodu: "2027-03-15", dataPorodu: "2027-03-08" }, parametry, planAnny);
rowne("ZUS: wniosek od rzeczywistej daty, plan dla innej daty pominięty", zusPoPorodzie,
  { wniosek: "2027-03-29", doPracodawcy: [] });

console.log(`WYNIK: ${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
