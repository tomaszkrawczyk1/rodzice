# Parser wniosków (ZAM / Z-3 / Z-3a) → dane → silnik

Wymóg zadania: na stronie ma być możliwość **wgrania lub wyboru** wniosku (PDF), sprawdzenia ubezpieczenia i kalkulatora. Jury użyje części przykładowych spraw i **sprawdzi poprawność wyliczeń**.

Ten dokument powstał z druków `ZAM_pobierz i drukuj.pdf`, `Z-3_do druku.pdf`, `Z-3a_pobierz_plik_do_wydruku.pdf` (puste wzory). **Nie widziałem wypełnionych przykładowych spraw ZUS** — nie ma ich w folderze, więc nie wiem, czy są to skany, PDF-y z tekstem czy z polami formularza. W surowych bajtach pustych druków nie znalazłem znacznika AcroForm (to nie jest pewne — może siedzieć w skompresowanym strumieniu), więc zakładaj, że przykłady to PDF-y z tekstem albo skany, i sprawdź to na prawdziwym przykładzie przed wyborem techniki.

## 1. Zalecany tok (3 warstwy)

1. **Wydobycie tekstu**: PDF z tekstem → `pdf.js`/`pdfminer`; skan → OCR (np. Tesseract z językiem polskim) lub model wizyjny.
2. **Ekstrakcja pól przez LLM** z wymuszonym schematem JSON (niżej) — to jest „funkcja z AI” do wskazania w zgłoszeniu. Temperatura 0, każde pole z `pewnosc` 0–1 i `zrodlo` (strona/fragment).
3. **Walidacja deterministyczna** (kod, nie AI): PESEL (suma kontrolna), spójność dat (od ≤ do), liczby dni, okresy vs. wymiary z `parametry.json`. Pola o niskiej pewności → użytkownik potwierdza w formularzu, zanim dane trafią do silnika.

**Nigdy** nie licz kwot w LLM — tylko ekstrakcja; kwoty liczy `kalkulator.ts`.

## 2. Schemat wyjściowy (wspólny dla trzech druków)

```jsonc
{
  "typ_dokumentu": "ZAM" | "Z-3" | "Z-3a",
  "wersja_druku": "string|null",            // np. "zam. nr 2965/26" ze stopki
  "ubezpieczony": { "pesel": "string|null", "imie": "", "nazwisko": "", "data_urodzenia": "YYYY-MM-DD|null" },
  "platnik": { "nip": "", "regon": "", "nazwa": "", "liczba_ubezpieczonych": "do_20" | "powyzej_20" | null },
  "dzieci": [{ "imie_nazwisko": "", "pesel": "", "data_urodzenia": "YYYY-MM-DD", "miejsce_urodzenia": "", "za_zyciem": true|false }],
  "drugi_rodzic": { "imie": "", "nazwisko": "", "pesel": "", "data_urodzenia": "" } | null,
  "wnioskowane_okresy": [{ "rodzaj": "macierzynski|na_warunkach_macierzynskiego|rodzicielski|uzupelniajacy|ojcowski",
                           "od": "YYYY-MM-DD", "do": "YYYY-MM-DD", "czesc": 1|2|null }]
}
```

### ZAM — pola specyficzne (druk ZAM, 5 stron + informacja)

| Sekcja druku | Pole schematu |
|---|---|
| „Zakres wniosku” — okresy urlopu macierzyńskiego / na warunkach / rodzicielskiego (+ „która to część”) / uzupełniającego / ojcowskiego (+ „która część”) | `wnioskowane_okresy[]` |
| „Podaj datę zakończenia okresu pobierania zasiłku za urlop macierzyński” | `data_konca_macierzynskiego` |
| Pole: „zamierzam skorzystać z pełnego wymiaru urlopu macierzyńskiego i rodzicielskiego … co najmniej jeden dzień urlopu rodzicielskiego w pierwszym roku życia dziecka” | `wariant_81_5: true/false` (→ `PlanWejscie.wariant`) |
| „Informacje o ubezpieczeniu” (JDG/współpracujący/duchowny/marynarz): objęty ubezpieczeniem chorobowym TAK/NIE | `ubezpieczenie_chorobowe: true/false` |
| „Wnioskuję w związku z”: 1 urodzenie / przyjęcie z wystąpieniem do sądu / rodzina zastępcza (+ data przyjęcia); 2 przewidywana data porodu; 3 po ustaniu zatrudnienia (upadłość/likwidacja/wyrok/śmierć pracodawcy); 4 uzupełniający + wcześniactwo/masa/pobyt w szpitalu (okres od–do); 5 sytuacja matki (skrócenie po 14 tyg., szpital po 8 tyg., niezdolność do egzystencji, praca ≥ ½ etatu, porzucenie, śmierć) + data; 6 wypisanie ze szpitala (mnie/dziecka) + data | `podstawa_wniosku`, `tytul` (`porod`/`przysposobienie`/`rodzina_zastepcza`), `data_zdarzenia`, `uzupelniajacy{tydzien_ciazy_kategoria, masa_do_1000g, pobyt_od, pobyt_do}`, `sytuacja_matki{rodzaj, data}` |
| Oświadczenie ojca: pobierał z innego tytułu zasiłek za urlop ojcowski TAK/NIE + tytuł i okres | `ojciec_pobieral_ojcowski_inny_tytul` |
| „Drugi rodzic będzie korzystał z zasiłku za rodzicielski / uzupełniający” TAK/NIE + okres od–do | `drugi_rodzic_okres` |
| Rachunek bankowy (dobrowolny) | **nie przetwarzać / maskować** |

### Z-3 (płatnik → ZUS, pracownik) — to z niego bierzesz dane do podstawy

| Sekcja druku | Pole schematu | Użycie w silniku |
|---|---|---|
| „Pracownik występuje o”: zasiłek macierzyński za okres od–do (chorobowy, opiekuńczy, w wysokości macierzyńskiego, wyrównawczy, rehabilitacyjny — też) | `wnioskowane_okresy[]` | — |
| „Informacje o pracowniku” 1: zatrudniony od–do; wymiar czasu pracy + od kiedy w tym wymiarze | `zatrudnienie{od,do,wymiar_etatu,wymiar_od}` | `pelnyWymiarEtatu` (min. podstawa), zmiana wymiaru art. 40 |
| 2–3: praca tymczasowa, praca za granicą | `tymczasowy`, `za_granica` | flagi → ostrzeżenia |
| 4: choroba zawodowa / wypadek | `wypadek` | — |
| 5: urlop bezpłatny/wychowawczy, areszt, kara, urlop opiekuńczy, nieobecność z art. 63² § 8 KP (śmierć pracodawcy) + okresy | `przerwy[]` | wyłączenia (art. 12) |
| 6: udzielone urlopy (macierzyński, rodzicielski, na warunkach, uzupełniający, ojcowski, „NIE – po ustaniu zatrudnienia”) + okres od–do + **data złożenia wniosku** + **stawka % jeśli płatnik wypłacał** + dane dziecka + dane drugiego rodzica | `urlopy_udzielone[]` | `PlanWejscie.rodzicielski[]`, `ojcowski[]`; stawka → kontrola wariantu |
| 7: praca u swojego pracodawcy w czasie rodzicielskiego + okres + **wymiar czasu pracy** | `laczenie_z_praca[{od,do,wymiar}]` | `BlokRodzicielski.wspolczynnikPracy` (np. ½ → 0.5) |
| „Informacje o wypłaconych świadczeniach” (wynagrodzenie chorobowe art. 92 KP, zasiłek chorobowy — okresy i kody) | `wyplacone[]` | okres zasiłkowy, art. 43 |
| „Pozostałe informacje”: do 20 / powyżej 20 ubezpieczonych | `platnik.liczba_ubezpieczonych` | `uprawnienia().ktoWyplaca` |
| **Tabela 1 – składniki za okresy miesięczne** (rok, miesiąc, dni przepracowane, dni obowiązany przepracować, przyczyna nieprzepracowania, składniki stałe w pełnej wysokości, zmienne pomniejszone proporcjonalnie, premie w kwocie faktycznej, procent składki) | `skladniki_miesieczne[]` | `wierszZ3NaMiesiac()` → `podstawaPracownik()` |
| Tabele 2–4 – kwartalne, roczne, inne okresy | `skladniki_kwartalne[]`, `skladniki_roczne[]` | `premieKwartalne4Kw`, `premieRoczne` (1/12) |
| Pkt 5 – zlecenie / składnik do określonego terminu | `skladniki_terminowe` | wyłączenie po terminie (art. 41) |

### Z-3a (płatnik → ZUS, niepracownik z umowy zlecenia itp.)

Jak Z-3, ale: „Informacje o ubezpieczeniu” (czy objęty chorobowym, od kiedy, czy **tytuł ustał** i kiedy), **tabela „Informacje o przychodzie”** (rok, miesiąc, dni przepracowane / obowiązany, **podstawa wymiaru składek**) → `podstawaNiepracownik()`, „data złożenia wniosku o zasiłek macierzyński” i stawka %.

## 3. Mapowanie na wejście silnika (pseudokod)

```ts
const miesiace = z3.skladniki_miesieczne.map(wierszZ3NaMiesiac);      // kalkulator.ts, sekcja 7
const podst = podstawaPracownik({ miesiace, premieKwartalne4Kw, premieRoczne,
                                  pelnyWymiarEtatu: z3.zatrudnienie.wymiar_etatu === 1 }, parametry);
const plan = planZasilku({ tytul, dataZdarzenia, liczbaDzieci: zam.dzieci.length,
      zaswiadczenieZaZyciem: zam.dzieci.some(d => d.za_zyciem),
      wariant: zam.wariant_81_5 ? "usredniony_81_5" : "zmienny_100_70",
      podstawy: { matka: podst.podstawaMiesieczna }, rodzicielski: [...], ojcowski: [...] }, parametry);
```

**Uwaga o kolumnie 9 (procent składki):** w Z-3 jest on podawany per miesiąc i może różnić się od 13,71 %. Silnik używa jednego parametru — jeśli przykłady jury mają inne wartości, rozszerzyć `MiesiacWynagrodzenia` o `procentSkladki` i odejmować wg niego (zob. LUKI B6).

## 4. Co pokazać użytkownikowi po wczytaniu (UX)

1. Ekran „Odczytane dane” — tabela pól z podświetleniem niskiej pewności, możliwość poprawy.
2. „Czy ma ubezpieczenie?” — z `ubezpieczenie[]` mocku API (`dane_testowe/mock_api/*.json`) albo z Z-3a („tytuł ustał?”).
3. Wynik kalkulatora z krokami „dlaczego taki wynik” (`PodstawaWynik.kroki`, `PlanWynik.kroki`).
4. **Porównanie z kwotą z dokumentu**, jeśli druk ją zawiera (np. stawka % wypłacona) — rozbieżność = ostrzeżenie, nie błąd.

## 5. Dane demo i prawo

- Dokumentów ZUS **nie wolno rozpowszechniać** (treść zadania, pkt 2). Do repozytorium i demo — **własne, zanonimizowane** PDF-y z fikcyjnymi danymi (PESEL-e fikcyjne, jak w `mock_api`).
- Puste wzory druków są publiczne na zus.pl (zakładka Wzory formularzy → Zasiłki), ale przykładowe **sprawy** z hackathonu są tylko na użytek HackNation.
- Rachunek bankowy i PESEL: nie logować, nie wysyłać do zewnętrznych API poza modelem używanym do ekstrakcji; zaznaczyć to w opisie użycia AI.
