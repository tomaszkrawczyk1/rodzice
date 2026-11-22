# Plan poprawek UI – Przewodnik Przyszłego Rodzica

Strona: https://zxcvbnms.dev/ (kod: ten folder `rodzice`, Next.js – przeczytaj najpierw `AGENTS.md`).

## Zanim zaczniesz

> **AKTUALNE MIEJSCE PRACY (po merge'u):** folder `C:\Users\kajet\Desktop\rodzice`, gałąź **`wyglad-zus`** (założona z `main-after-merfe`).
> Serwer deweloperski tego folderu już działa: **http://localhost:3101** (odświeża się sam po zmianach w kodzie; nie uruchamiaj drugiego `next dev`).
> Stary folder `C:\Users\kajet\Desktop\hackaton\rodzice` (gałąź `poprawki-ui`, port 3108) to starsza linia kodu sprzed merge'a. **Nie pracuj tam.**
> Nie commituj na `main` ani na `main-after-merfe`. Wszystkie kolejne poprawki robimy na `wyglad-zus`. Przed pracą sprawdź `git branch --show-current`.

1. ~~Utwórz nową gałąź od `main`~~ – gałąź `wyglad-zus` już istnieje (patrz ramka wyżej).
2. Po każdej większej poprawce sprawdź ją w przeglądarce na http://localhost:3101 (komputer i telefon).
3. Szukaj tekstów z ekranu przez grep w `src/` – większość jest w `src/content/tresci.ts`, `src/components/` i `src/app/<zakładka>/`. Nazwy zakładek w menu i okruszkach są w jednym miejscu: mapa `P` w `src/components/Header.tsx`.

## Stan na dziś (po merge'u `main-after-merfe`)

Merge wprowadził inny wygląd (serce zamiast logo ZUS, żółty pasek, inny układ strony głównej), więc na `wyglad-zus` przywrócono **tylko grafikę**, a nowsze funkcje z merge'a zostały:
- ✅ logo ZUS w nagłówku zamiast serca (`Header.tsx`, `Header.module.css`),
- ✅ ikona karty przeglądarki: litery ZUS (`src/app/icon.svg`),
- ✅ pasek „Wersja demonstracyjna” w spokojniejszej, cienkiej wersji (`PasekDemo.module.css`; tekst „To nie jest oficjalna usługa ZUS” zostaje),
- ✅ strona główna: wyszukiwarka pod tytułem, duży zielony kafel „Dziecko już jest z nami”, potem pozostałe kafle (`src/app/Glowna.tsx`),
- ✅ dopisane `suppressHydrationWarning` na `<body>` (`layout.tsx`), bo dodatek Grammarly wywoływał ostrzeżenie w konsoli.

Zostało z merge'a (nie cofać): tryb nocny, skalowanie tekstu 100/115/130%, podpisane przyciski dostępności, nowe nazwy w menu, widok etapu z kartą „Pilne po porodzie”.

**Nic z powyższego nie jest jeszcze zacommitowane.** Przed dalszą pracą zacommituj to na `wyglad-zus`.

Uwaga: wyszukiwarka na stronie głównej i porządek w repozytorium nadal wymagają Twojej decyzji (patrz ramki na dole).

---

## 1. Ikona w lewym górnym rogu ✅ WYKONANE (na `wyglad-zus`)
- Teraz: zielone serce.
- Ma być: logo/ikona ZUS (zamiast serca).
- Zrobione: w nagłówku jest logo ZUS (`/logo_zus_darker_with_text.svg`), a `src/app/icon.svg` (ikona karty przeglądarki) to litery ZUS na zielonym tle.
- Gdzie: `src/components/Header.tsx`, `src/components/Header.module.css`, `src/app/icon.svg`.

## 2. Nazwa zakładki „Terminy w urzędach” ✅ WYKONANE (na `wyglad-zus`, folder `Desktop\rodzice`)
- Zrobione: zakładka nazywa się teraz „Kalendarz w urzędzie” w menu, nagłówkach, okruszkach i linkach z innych stron.
- Konkretnie: `Header.tsx` (mapa `P`, wpis `terminarz`, oraz komentarz z mapą nazw ok. linii 19), `src/app/terminarz/Terminarz.tsx` (dwa nagłówki `<h1>`, ok. linii 162 i 228), `src/app/terminarz/layout.tsx` (tytuł karty). Nie znaleziono innych odnośników „w terminach w urzędach”, ale sprawdź jeszcze grepem.
- Zmień na **„Kalendarz w urzędzie”** – w menu, w nagłówku strony, w okruszkach (breadcrumb) i w linkach z innych stron (np. „terminach w urzędach” w „Kto wypłaca zasiłek”).
- Gdzie: `src/components/Header.tsx`, `src/app/terminarz/`, grep „Terminy w urzędach” / „terminach w urzędach”.

## 3. „Co mnie dotyczy?” – złe linki ✅ WYKONANE (na `wyglad-zus`)
- Poprawione: „uprawnienia” prowadziły z powrotem do kreatora (teraz `/sprawa/co-przysluguje`), „terminy” → `/terminarz`, wyniki bez kalkulatora dostały własny przycisk (`/ryzyka`, `/trudne`, `/formularze`, `/odpis`). Zmiany: `src/content/poradnik.ts`, `drzewo_decyzyjne.json`, `kreator/Pytania.tsx`.
- Niektóre opcje (Planuję dziecko, Czekamy na dziecko, Dziecko już jest, Adopcja…, Trudna sytuacja…, Chcę tylko wiedzieć, jakie złożyć dokumenty) prowadzą w złe miejsca.
- Przeklikaj każdą opcję i każdą ścieżkę dalej. Każda ma prowadzić do pasującej strony/sekcji.
- Gdzie: `src/app/kreator/`, `src/app/poradnik/`, `src/content/poradnik/drzewo_decyzyjne.json`.

## 4. „W ciąży” – dane wpisane bez logowania ✅ WYKONANE (na `wyglad-zus`, folder `Desktop\rodzice`)
- Zrobione: wszystkie pola puste, nic nie liczy się samo; „Sprawdź uprawnienia” podpowiada, czego brakuje. Po zalogowaniu dane z ZUS wypełniają pola. (`src/app/ciaza/page.tsx`)
- Teraz: formularz „Twoja sytuacja” jest już wypełniony (Umowa o pracę, 400 dni, 21.04.2027, 50 osób, 6500 zł, 60 dni…), mimo że nikt się nie zalogował.
- Ma być: puste pola, gdy użytkownik nie jest zalogowany. Dane wolno wstawić tylko po zalogowaniu (mObywatel) albo gdy użytkownik sam je wpisał.
- Gdzie: `src/app/ciaza/page.tsx`, `src/lib/dane-profilu.ts`.

## 5. Kalkulator – krok 4 „Urlopy i ich podział” ✅ WYKONANE (na `wyglad-zus`, folder `Desktop\rodzice`)
- Zrobione w `src/app/kalkulator/PlanRodziny.tsx`: wspólna pula rodzicielskiego (suwaki zabierają sobie nawzajem, jeden rodzic maks. pula − 9 tyg., łączenie z pracą też zużywa pulę), komunikat pod suwakiem, gdy nie idzie dalej; uzupełniający i przejęcie przez ojca ukryte za zaznaczeniem (uzupełniający ograniczony wynikiem „Policz, ile przysługuje”). Domyślny tryb „łączenie” poprawiony na 12+20+9 = 41 tyg.
- Opis oryginalny poniżej:
- Teraz: wszystkie suwaki można ustawić na maksimum naraz (matka 43 tyg. + ojciec 43 tyg. rodzicielskiego, ojciec przejmuje 6 tyg., uzupełniający 15 tyg.).
- Sprawdź z przepisami i dodaj limity:
  - urlop rodzicielski: razem 41 tyg. (1 dziecko) / 43 tyg. (ciąża mnoga) na **oboje**, z czego 9 tyg. tylko dla każdego rodzica – suma suwaków nie może przekroczyć limitu (przesunięcie jednego zmniejsza drugi),
  - uzupełniający urlop macierzyński (wcześniak/szpital) – tylko gdy zaznaczono taką sytuację, długość zależna od tygodnia porodu / pobytu w szpitalu,
  - przejęcie końcówki macierzyńskiego przez ojca – tylko w uzasadnionych przypadkach, nie domyślnie.
- Pokaż krótki komunikat, dlaczego suwak dalej nie idzie.
- Gdzie: `src/app/kalkulator/Kalkulator.tsx`, `src/app/kalkulator/stale.ts`, `src/engine/kalkulator.ts`, `data/parametry.json`.

## 6. Kalkulator – krok 5 „Wariant” ✅ WYKONANE (na `wyglad-zus`)
- Teraz: „Standardowy (100% / 70%)” i „Uśredniony (81,5%)” – laik nie wie, co wybrać.
- Ma być:
  - prosty opis każdej opcji („dostajesz więcej na początku, mniej później” / „cały czas tyle samo”),
  - przy każdej opcji kwota z wyliczeń użytkownika (łącznie i miesięcznie),
  - podpowiedź „Nie wiesz? Wybierz…” + informacja, że uśredniony trzeba zgłosić w 21 dni od porodu.
- Gdzie: `src/app/kalkulator/Kalkulator.tsx`.

## 7. „Kto wypłaca zasiłek” – „Daty z Twojego planu” ✅ WYKONANE (na `wyglad-zus`)
- Teraz: daty po prostu się pojawiają.
- Ma być: przy każdej dacie przycisk **„Dodaj do mojego planu”** (i „Usuń”). Użytkownik sam decyduje, co trafia do planu.
- Usuń albo schowaj pozycje typu **„Przedawnienie roszczenia o zasiłek…”** – to nie jest wniosek, kobieta nic wtedy nie składa. Zostaw tylko rzeczy, które użytkownik musi zrobić (wnioski, terminy). Ewentualnie jedna krótka informacja na dole: „Masz 6 miesięcy na upomnienie się o zasiłek”.
- Posortuj daty od najwcześniejszej (teraz „Do 11 września 2027” jest prawie na końcu).
- Gdzie: `src/app/dokumenty/page.tsx`, `src/lib/sprawy.ts`, grep „Przedawnienie”.

## 8. Kreator wniosków
- Zakładki „Wniosek o urlop / Połączenie pracy z urlopem / Wniosek o zasiłek (ZAM)” – **zostają tak jak są**, to nie jest błąd. Nic nie zmieniać.

## 9. Kalendarz ciąży – termin porodu vs dziecko urodzone ✅ WYKONANE (na `wyglad-zus`)
- Zrobione: dwa przyciski „Jestem w ciąży” / „Dziecko już się urodziło”, pokazują tylko pola wybranej opcji (`Kalendarz.tsx`).
- Teraz: jest i „Planowany termin porodu”, i rozwijane „Dziecko już się urodziło?” z datą porodu – oba naraz.
- Ma być: wybór jednego z dwóch (np. dwa przyciski „Jestem w ciąży” / „Dziecko już się urodziło”). Pokazujemy tylko pola dla wybranej opcji.
- Gdzie: `src/app/kalendarz/page.tsx`, `src/components/Kalendarz.tsx`.

## 10. Kalendarz ciąży – oś czasu ✅ WYKONANE (na `wyglad-zus`)
- Zrobione: pole „Zrobione” (localStorage), wyszarzenie, czerwone „Po terminie”, panel boczny (`PanelBoczny.tsx`, `zrobione.ts`) także dla „Najbliższych zadań”.
- Przy każdej pozycji pole **„Zrobione”** (checkbox), zapamiętane w przeglądarce (localStorage).
- Zrobione pozycje: mocno wyszarzone.
- Termin minął i nie zaznaczono „Zrobione”: **czerwona** ramka/etykieta „Po terminie”.
- Kliknięcie zielonego tytułu (np. „Szczepienie noworodka przeciw gruźlicy (BCG)”) ma otwierać **panel z boku ekranu** (drawer) z krótkim opisem badania + przycisk „Zamknij”. Bez przeskakiwania na dół strony i bez rozwijania wielkiej sekcji.
- To samo dla „Najbliższe zadania dla Ciebie” u góry.
- Gdzie: `src/components/OsKalendarza.tsx`, `src/components/os-kalendarza.module.css`, `src/components/Kalendarz.tsx`.

## 11. „Kalendarz w urzędzie” (dawne Terminy w urzędach) – oś czasu ✅ WYKONANE (na `wyglad-zus`)
- Dodać oś czasu **jak w Kalendarzu ciąży** (ten sam komponent, jeśli się da).
- Na osi: krótka wersja (data, nazwa, gdzie złożyć). Kliknięcie otwiera panel z boku z pełną instrukcją (dokumenty, linki do druków, źródła).
- Wyróżnione „Teraz / co zrobić teraz”.
- Zaznaczanie „Zrobione” + wyszarzenie; po terminie i niezrobione = czerwone (jak w pkt 10).
- Gdzie: `src/app/terminarz/Terminarz.tsx`, `src/components/OsKalendarza.tsx`.

## 12. Adopcja – podwójna kwota ✅ WYKONANE (zostaje duża zielona kwota, czarna usunięta)
- Teraz: „Szacowany zasiłek …: 85 240,71 zł.” w nagłówku (czarne) i drugi raz duża zielona kwota.
- Ma być: kwota tylko raz, **czarna**. Usuń dużą zieloną.
- Gdzie: grep „Szacowany zasiłek” (`src/app/trudne/`, `src/app/kalkulator/WynikSzczegoly.tsx`).

## 13. Kolory przycisków ✅ WYKONANE (na `wyglad-zus`)
- Niektóre przyciski są granatowe/niebieskie (np. „Tekst 100%”, „Nocny”, „Kontrast”, „Wstecz”, „Ustaw 9 tygodni…”, filtry w osi czasu „Wszystko / Badania i wizyty…”).
- Ujednolicić na zielony (główny – pełny zielony, drugorzędny – biały z zieloną ramką).
- Gdzie: `src/app/globals.css`, `src/app/ux.css`, `src/components/ui.tsx`, `src/components/Dostepnosc.tsx`.

---

## ⚠️ NIE ROBIĆ SAMEMU: wyszukiwarka na stronie głównej

Wyszukiwarka „Opisz sprawę własnymi słowami” (np. wpisanie „zas”) działa źle i trzeba ją naprawić.
**To zadanie wymaga decyzji i uwagi użytkownika – czat nie może go zrobić sam.** Zanim cokolwiek zmienisz: opisz użytkownikowi, co jest nie tak i jakie są opcje, i poczekaj na jego decyzję.
(Pliki: `src/components/Szukaj.tsx`, `src/app/Glowna.tsx`.)

## ⚠️ NIE ROBIĆ SAMEMU: porządek w repozytorium

Trzeba zrobić porządek w repozytorium (np. stare i zdublowane pliki, kopie, backupy, zbędne `.bat`/`.zip`, pliki builda, które nie powinny być w gicie, bałagan w folderach).
**To zadanie wymaga aktywności użytkownika.** Najpierw pokaż użytkownikowi listę rzeczy do usunięcia lub przeniesienia i poczekaj, aż ją zatwierdzi. Niczego nie usuwaj bez jego zgody.
**Jeśli zadania z tego planu robisz automatycznie (po kolei, bez pytania), to przed tym zadaniem zapytaj użytkownika DRUGI RAZ, czy na pewno mam je robić.** Bez wyraźnego „tak” pomiń je.

---

## Na koniec
- Przejdź całą stronę w przeglądarce (też na telefonie i w trybie „Nocny”/„Kontrast”).
- Uruchom testy (`1_uruchom_testy_kalkulatora.bat`), jeśli zmieniałeś kalkulator.
- Commit na gałęzi `poprawki-ui`, bez pushowania na `main`.
