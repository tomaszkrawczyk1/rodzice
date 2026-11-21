# Luki, sprzeczności i decyzje do podjęcia

Lista powstała z porównania: treść zadania ZUS, Załącznik ZUS, wyciągi przepisów (ustawa zasiłkowa, KP), poradnik ZUS 2026, druki ZAM / Z-3 / Z-3a, `baza_regul_dedup.json` i Excel.
**Nie porównywałem Excela z JSON-em wiersz po wierszu** — sprawdziłem tylko wskazane niżej miejsca. Jeśli chcesz pełne porównanie, to osobne zadanie.

## A. Błędy w bazach (nie kopiować do kodu bez poprawki)

| # | Gdzie | Problem | Co zrobić |
|---|-------|---------|-----------|
| A1 | JSON `F-PODSTAWA-01` (podstawa dla pracownika), `R-PODSTAWA-01` | W krokach 1–8 **nie ma odjęcia 13,71 %**. Krok 9 wspomina 13,71 % tylko przy minimalnej podstawie. Załącznik ZUS i poradnik: podstawa = średnia z 12 mies. **pomniejszona o 13,71 %**. `F-PODSTAWA-02` (niepracownik) odejmuje poprawnie → baza jest niespójna. Kto zakoduje wprost z JSON-a, zawyży każdy zasiłek o ok. 15,9 %. | Silnik referencyjny odejmuje 13,71 % zawsze (test „Anna: 6500 → 5608,85”). |
| A2 | JSON `F-PODSTAWA-01`, uzupełnienie `F-CIAZA-01` | „80 % w innych przypadkach” — to stawka zasiłku **chorobowego** (art. 11 ust. 1), nie macierzyńskiego. W tej samej formule mieszają się stawki chorobowego i macierzyńskiego. | Rozdzielić: chorobowe (80 % / 100 % w ciąży) i macierzyńskie (100 / 70 / 81,5 %). |
| A3 | JSON `adopcja_rodzina_zastepcza` (podsumowanie, dane_wejsciowe) | „Dodatkowe 9 tygodni” przy adopcji. Załącznik ZUS mówi: zasiłek za urlop na warunkach macierzyńskiego „nie może trwać krócej niż **9 tygodni**” (**minimum** gdy limit wieku skróciłby urlop), a nie 9 tyg. ponad wymiar. KP art. 183 § 3 jest sformułowany niejasno (też 38/62 tyg. rodzicielskiego). | **Dodatkowo baza jest niespójna:** JSON (`T-WURL-03`) wiąże „9 / 38 / 62 tyg.” z dzieckiem „do 7 lat”, a Excel (wiersz 11) z „dziećmi starszymi”. Silnik traktuje 9 tyg. jako **minimum po obcięciu limitem wieku** — to moja interpretacja z Załącznika, nie z JSON/Excela. Poradnik (F23) oznacza ten punkt jako „do potwierdzenia” i nie podaje tej liczby. Punkt do potwierdzenia u mentora ZUS. Dla personów z listy (dziecko 2 lata) nie ma znaczenia. |
| A4 | Poradnik ZUS 2026 vs druki | Poradnik wciąż pisze o Z-3b dla przedsiębiorcy. Zadanie: ZUR, ZAO, Z-3b zlikwidowane od 24.10.2026; ZAM (nowy) mówi, że przedsiębiorca **nie składa** dodatkowo zaświadczenia płatnika. | W aplikacji: ZAM + (Z-3 dla pracownika / Z-3a dla zlecenia przez płatnika). Dla JDG samo ZAM. |
| A5 | Wymóg „wniosek w 21 dni po porodzie” (81,5 %) | W nowym druku ZAM to **pole wyboru**: „zamierzam skorzystać z pełnego wymiaru … i co najmniej jeden dzień urlopu rodzicielskiego przypadać będzie w pierwszym roku życia dziecka”. Poradnik: „wniosek lub deklaracja”. Baza opisuje to jako osobny wniosek. | Kreator wniosku ZAM ma mieć to pole + komunikat o 21 dniach. Warunek „co najmniej 1 dzień rodzicielskiego w 1. roku życia” → patrz B3. |

## B. Czego baza i silnik NIE pokrywają (luki)

| # | Luka | Stan w pakiecie |
|---|------|-----------------|
| B1 | **Rehabilitacja** (90 % / 75 % / 100 %) | JSON: brak stawek. Silnik: `swiadczenieRehabilitacyjne` (art. 19 ust. 1). **Brak waloryzacji** (art. 19 ust. 2). |
| B2 | **Świadczenie rodzicielskie** (kwota, czas) | JSON: brak. Silnik: `swiadczenieRodzicielskie` (1000 zł; 52/65/67/69/71 tyg.; niepełny miesiąc ÷ dni kalendarzowych). **Warunki dochodowe/formalne nie opisane** — wniosek do gminy/OPS. Wydłużenie o hospitalizację tylko jako parametr. |
| B3 | Jednorazowe **wyrównanie do 100 %** gdy nie wykorzystano ani dnia rodzicielskiego w 1. roku życia (art. 31 ust. 3g, 4) | Niezaimplementowane. Ostrzeżenie w UI wystarczy na hackathon. |
| B4 | **Podstawa niepracownika <12 mies. przy zadeklarowanej kwocie** (art. 48a), art. 49 (niezdolność przed pełnym miesiącem) | Niezaimplementowane — silnik ostrzega i liczy średnią z podanych miesięcy. |
| B5 | Podstawa pracownika: niezdolność przed upływem pełnego miesiąca (art. 37), wynagrodzenie zmienne innych pracowników, zmiana wymiaru etatu (art. 40), składniki do określonego terminu (art. 41) | Silnik: tylko wyłączanie miesięcy <½ czasu, uzupełnianie z Z-3, premie 1/12, minimum. Reszta → pola `kwotaUzupelniona` ustawiane przez parser/kreatora. |
| B6 | **Procent potrąconej składki** z Z-3 (kol. 9) bywa ≠ 13,71 % | Silnik używa jednego parametru `skladki_odliczane_od_podstawy`. Jeśli jury poda inną wartość w Z-3, trzeba brać z formularza. |
| B7 | Podwyższenie do 1000 zł (art. 31 ust. 3a) **przy łączeniu z pracą** | Niejasne w przepisach; silnik nie podwyższa przy łączeniu. |
| B8 | **Organizacje wsparcia** (wymóg i) | **Korekta mojego wcześniejszego opisu:** JSON nie ma nazw, ale **Excel (wiersz 22) zawiera listę 5 kandydatów** (m.in. Fundacja Wcześniak Rodzice-Rodzicom, Fundacja Medycyny Prenatalnej im. Ernesta Wójcickiego, Hospicjum Perinatalne, Fundacja Panda Team, Fundacja Rodzić po Ludzku), oznaczoną jako „do potwierdzenia przed publikacją” — oficjalne strony, kontakty i wyłącznie charytatywny charakter są niepotwierdzone. Poradnik (F26) pokazuje ją z tą adnotacją. Przed publikacją ktoś musi sprawdzić każdą organizację. |
| B9 | **Zasiłek w wysokości macierzyńskiego** (art. 30 ust. 3 — upadłość/likwidacja/śmierć pracodawcy) | Prawo opisane w `uprawnienia()` tylko tekstem; brak osobnego kalkulatora (stawka 100 % do dnia porodu). |
| B10 | Okres zasiłkowy (182/270 dni, przerwa 60 dni), kontrola zwolnień | Parametry są, logika wliczania poprzednich okresów — nie. |
| B11 | Urlop wychowawczy, zasiłek opiekuńczy, becikowe | Poza ścisłym zakresem; tylko odnośniki. |
| B12 | **Przykładowe sprawy ZUS** („kilkadziesiąt spraw”) | **Nie ma ich w folderze.** Jury sprawdzi wyliczenia na nich. Wyniki wzorcowe w tym pakiecie pochodzą z silnika, nie z decyzji ZUS (patrz C1). |

## C. Ryzyka dokładności (to jury testuje)

- **C1. Zaokrąglenia.** Silnik: kwota = podstawa × % × dni ÷ 30, zaokrąglona raz na końcu do grosza. ZUS w praktyce może liczyć pełne miesiące kalendarzowe jako kwotę miesięczną, a części miesiąca po 1/30. Różnica to kilka złotych w skali sprawy. **Jeśli na przykładowych sprawach wyjdzie rozbieżność, zmienić tylko funkcję `kwotaOkresu`** (jedno miejsce).
- **C2. Dzień porodu** liczony jako dzień 1 urlopu (140 dni od 15.03 kończy się 1.08). Zgodnie z KP art. 1831 (pierwszy dzień urlopu) — zweryfikować na sprawach.
- **C3. 81,5 % a część ojca.** Założenie: 9 tyg. niezbywalnych drugiego rodzica = zawsze 70 %; resztę rodzicielskiego (także gdy bierze ją ojciec) liczymy po 81,5 % w wariancie uśrednionym. Przepis (art. 30a ust. 3, art. 31 ust. 3, 3f) na to pozwala, ale tego wprost nie rozstrzyga.
- **C4. Zgon matki** (P10): założono, że ojciec może wziąć całe 41 tyg. rodzicielskiego (bez limitu E−9). Potwierdzić.
- **C5. Dominika (P08)**: czy do podstawy wchodzi wynagrodzenie ze starej pracy (art. 36 ust. 4, „u płatnika składek w okresie nieprzerwanego ubezpieczenia”). Liczone oba warianty (podstawa A: 5240,16 zł / B: 5436,27 zł — patrz `przypadki_testowe.json`, P08).
- **C6. Karolina (P09)**: podstawa macierzyńskiego przy długim L4 — uproszczenie (taka sama jak chorobowego).
- **C7. Persona 3 (Katarzyna).** Zlecenie bez dobrowolnego chorobowego: brak zasiłku. Czy może teraz przystąpić do dobrowolnego chorobowego? Można, ale **bez wstecz**, a zasiłek chorobowy dopiero po 90 dniach; do **macierzyńskiego** wystarczy być ubezpieczoną w dniu porodu (art. 29), więc przy terminie 20.02.2027 i zgłoszeniu np. w grudniu 2026 prawo do macierzyńskiego **teoretycznie powstanie** — to jest scenariusz, który ZUS bada pod kątem pozorności (zagrożenie H1/H2 z zadania). Potrzebna decyzja, jak to komunikować (zalecam: informacja + ostrzeżenie o ryzyku, bez obietnicy).

## D. Dane, które trzeba dopisać zespołowi

- Teksty komunikatów (prosty język, **delikatny ton** dla P05, P06, P10).
- Treść wniosków o urlopy (zadanie: „wnioski o urlopy wymagają zaprojektowania”) — wzór: rozporządzenie w sprawie wniosków (jest w folderze), pola z `parametry.json → terminy_dni`.
- Lista organizacji wsparcia (B8).
- Zanonimizowane PDF-y demo (ZUS **zabrania** rozpowszechniania ich dokumentów — nie wrzucać do publicznego repo; wypełnione własnymi fikcyjnymi danymi).
