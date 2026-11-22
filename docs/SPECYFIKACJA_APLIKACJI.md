# Specyfikacja aplikacji — co zbudować i jak to podpiąć pod silnik

Oparta wyłącznie na **treści zadania ZUS** (sekcje 3–6) i na tym, co jest w pakiecie. Nie zakłada liczebności zespołu ani terminu — kolejność prac na końcu działa dla 1–3 osób.

## 0. Docelowy kształt aplikacji (opis od zespołu)

Aplikacja ma być przewodnikiem: użytkownik (kobieta w ciąży, partner, para adopcyjna) odpowiada na kilka pytań i dostaje **co mu przysługuje, ile, na jak długo i gdzie złożyć papiery**. Zakres, który ma pokrywać:

1. logowanie mObywatelem (symulacja) · 2. dane z ZUS (symulacja) **lub wpisane ręcznie** (np. termin porodu, data końca umowy) · 3. świadczenia w ciąży (chorobowe 100 %, rehabilitacja, zasiłek w wysokości macierzyńskiego, także „nic nie przysługuje”) · 4. **jeden kalkulator** z opcjami (liczba dzieci, „Za życiem”, macierzyński 20 tyg. z 14 tyg. obowiązkowo dla matki, rodzicielski 70 %, ojcowski 14 dni, uzupełniający, wariant 81,5 % przy wniosku w 21 dni) i **czterema trybami**: praca + rodzicielski (do ½ etatu), oboje rodzice (9 tyg. dla każdego, max 5 części), adopcja/RZ (limity wieku 7/10/14), **własne dane** (wybór przykładowej sprawy ZUS i liczenie dla jej podstawy) · 5. gdzie złożyć dokumenty (płatnik > 20 ubezpieczonych vs ZUS) · 6. ostrzeżenia o ryzykach **oraz ochrona pracownic w ciąży przed zwolnieniem** · 7. sytuacje trudne (martwe dziecko — 8 tyg., zgon dziecka, ciężka choroba, śmierć matki, wcześniak) · 8. wsparcie charytatywne.

Symulacje: zadłużenie w ZUS, e-ZLA, **PUE/eZUS (podgląd konta i możliwość zadania pytania)**, wnioski o urlop (wypełnia aplikacja i „wysyła”), odpis aktu urodzenia, linki do oficjalnych stron. Admin: zmiana parametrów bez programisty. Wymagania formalne: responsywność, wgranie/wybór przykładowego wniosku PDF, opis użycia AI, demo online.

Mapowanie na pakiet: pkt 3–4 → silnik (`kalkulator.ts`); tryb „własne dane” → `POST /api/parser` + `POST /api/oblicz/podstawa`; ochrona przed zwolnieniem i ostrzeżenia → treści (tabela w sekcji 3), wzorowane na regułach `R-OCH-01/02` z JSON-a (zakaz wypowiedzenia od ciąży do końca urlopu; umowa terminowa przedłużana do dnia porodu, jeśli skończyłaby się po 3. miesiącu ciąży — art. 177 KP, w wyciągu KP).

## 1. Architektura (rekomendacja)

- **Jedno repo, jedno wdrożenie**: Next.js (React) + silnik w TypeScripcie (`silnik/kalkulator.ts`) wołany z API routes. Zadanie preferuje React/Next.js i REST; JS jest dozwolony po stronie backendu.
- **Reguły i parametry jako JSON** (`parametry.json`) → panel admina edytuje ten sam plik/rekord. **Żadnej liczby z przepisów w kodzie.**
- Silnik jest **czysty** (bez I/O) → łatwo go testować i pokazać jury („przegląd struktury kodu”).
- Dane „z ZUS” = zasymulowane API z `dane_testowe/mock_api/`.

## 2. Endpointy REST (propozycja)

| Metoda i ścieżka | Wejście | Wyjście | Silnik |
|---|---|---|---|
| `POST /api/auth/mobywatel` | `{ personaId }` | token sesji (symulacja) | — |
| `POST /api/zus/ubezpieczenie` | `{pesel, naDzien}` w treści (PESEL nigdy w URL) | `ubezpieczenie[]` z mocka | — |
| `POST /api/zus/ezla` | `{pesel}` | lista e-ZLA (kod B) | — |
| `POST /api/zus/zadluzenie` | `{pesel, naDzien}` | kwota + „zaświadczenie” | `uprawnienia()` próg |
| `POST /api/oblicz/podstawa` | miesiące Z-3/Z-3a | `PodstawaWynik` | `podstawaPracownik/Niepracownik` |
| `POST /api/oblicz/plan` | `PlanWejscie` | `PlanWynik` | `planZasilku` |
| `POST /api/oblicz/porownanie` | jak wyżej bez `wariant` | oba warianty + różnica | `porownajWarianty` |
| `POST /api/oblicz/uprawnienia` | `UprawnieniaWejscie` | `UprawnieniaWynik` | `uprawnienia` |
| `POST /api/oblicz/chorobowe-ciaza` | `ChorobowyCiazaWejscie` | podział pracodawca/ZUS | `zasilekChorobowyWCiazy` |
| `POST /api/oblicz/rehabilitacja` | `{podstawa, dni, wCiazy}` | kwota | `swiadczenieRehabilitacyjne` |
| `POST /api/oblicz/swiadczenie-rodzicielskie` | `{liczbaDzieci, odDnia}` | tygodnie, okres, kwota | `swiadczenieRodzicielskie` |
| `POST /api/terminy` | tytuł, data, plan | lista terminów z podstawą prawną | `terminy` |
| `POST /api/pue/konto` · `POST /api/pue/pytanie` | PESEL · `{temat, tresc}` | podgląd konta ubezpieczonego (symulacja) · potwierdzenie wysłania pytania z numerem sprawy | — |
| `POST /api/parser` | PDF | JSON wg `PARSER_SCHEMAT.md` | LLM + walidacja |
| `POST /api/wniosek/urlop` , `/api/wniosek/zasilek` | dane | PDF/podgląd + „wysłano” (symulacja) | — |
| `POST /api/usc/odpis` | dane dziecka | potwierdzenie (symulacja wniosku o odpis aktu) | — |
| `GET/PUT /api/admin/parametry` | JSON | JSON | zapis `parametry.json` |

## 3. Ekrany ↔ wymagania zadania (a–j)

| Ekran | Wymóg | Treść |
|---|---|---|
| Start + logowanie mObywatel (symulacja) | „logowanie przez mObywatela” | wybór persony → pobranie danych |
| Wywiad (kroki) | „indywidualna sytuacja” | tytuł ubezpieczenia, status w ciąży/po porodzie, liczba dzieci, Za życiem, wcześniak, adopcja/RZ, praca na etacie/JDG |
| Uprawnienia w ciąży | **a** | zasiłek chorobowy (kod B, 100 %), rehabilitacja (90/75/100 %), zasiłek w wysokości macierzyńskiego, **także brak uprawnień** |
| Kalkulator zintegrowany | **b, c, d, e, f, j** | jeden kalkulator z opcjami: matka / ojciec / oboje / łączenie z pracą / adopcja i RZ; wynik: okresy + kwoty + „dlaczego” |
| Oś czasu / planer urlopów obojga rodziców | **d** | osie matka i ojciec, porównanie 100/70 vs 81,5 %, symulacje „co jeśli” |
| Dokumenty i terminy | **g** | kto wypłaca (płatnik >20 os. vs ZUS), jaki druk (ZAM / Z-3 / Z-3a), do kogo, termin |
| Ostrzeżenia | **h** | utrata prawa (zmiana pracy, brak ubezpieczenia w dniu porodu, zadłużenie JDG, pozorna umowa, podwyższenie podstawy) |
| Sytuacje trudne | **h, i** | martwe dziecko, wcześniak, śmierć matki, ciężka choroba — delikatny język + organizacje wsparcia |
| Organizacje wsparcia | **i** | lista tylko charytatywnych (do uzupełnienia — LUKI B8) |
| Kreator wniosków | symulacja wypełnienia i wysłania | wnioski o urlopy (do zaprojektowania) i ZAM / Z-3 / Z-3a |
| Wgraj/wybierz wniosek | wymóg strony demo | parser → weryfikacja ubezpieczenia → kalkulator |
| Odpis aktu urodzenia | symulacja | formularz + „wysłano” |
| Panel admina | „zmiana parametrów” | edycja `parametry.json` (stawki, wymiary, limity, terminy) |
| Linki | przekierowania | zus.pl, gov.pl/web/rodzina/urlop-rodzicielski, pip.gov.pl (adresy w treści zadania) |

Wymaganie techniczne: **w pełni responsywny** UI (desktop i mobile).

## 4. Zasady jakości liczb (to jury sprawdza)

1. Uruchom `silnik/testy.ts` w CI — 76 testów, oczekiwane liczby policzone niezależnie.
2. Dla każdej persony porównaj wynik aplikacji z `dane_testowe/przypadki_testowe.json`.
3. Gdy dostaniecie **przykładowe sprawy ZUS**: dopisz je jako kolejne przypadki; jeśli rozbieżność ≤ kilka zł → patrz `LUKI_I_DECYZJE.md` C1 (zaokrąglenia).
4. Zawsze pokazuj **kroki obliczeń** i **podstawę prawną** (ważne dla oceny „związek z wyzwaniem” i dla zaufania).
5. Zasiłek ≠ kwota netto: wyniki są **przed zaliczką na PIT** (poradnik: podstawa pomniejszana o 13,71 % i o zaliczkę na podatek przy wypłacie).

## 6. Kolejność prac (działa dla 1–3 osób)

1. Wczytać `silnik/` do repo, uruchomić testy, wystawić `/api/oblicz/*` (pół dnia).
2. Wywiad + wynik jednego kalkulatora (Anna P01) end-to-end — **najpierw jeden pełny scenariusz**.
3. Mock API + logowanie mObywatel + podgląd ubezpieczenia/e-ZLA/zadłużenia.
4. Planer obojga rodziców + porównanie wariantów + łączenie z pracą.
5. Dokumenty/terminy/ostrzeżenia + sytuacje trudne.
6. Parser PDF + kreator wniosków + odpis aktu.
7. Panel admina.
8. Dopiero na końcu: dłuższy czat z AI, becikowe, urlop wychowawczy, zasiłek opiekuńczy (poza ścisłym zakresem).

## 7. Pakiet zgłoszeniowy (HackTribe)

Opis i tytuł · prezentacja ≤ 10 slajdów · film ≤ 3 min w otwartym repozytorium (link) · repozytorium · zrzuty ekranu · demo online · opis, **które funkcje używają AI** (parser PDF; ewentualnie wyjaśnienia „dlaczego taki wynik”; **silnik obliczeń NIE używa AI** — to zaleta, napisać to wprost) · materiały graficzne. Filmu nie zostawiać na ostatnią chwilę.
