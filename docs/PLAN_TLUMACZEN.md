# Plan tłumaczeń: angielski (EN) i ukraiński (UK)

## Jak to działa (już zrobione)

- Język wybiera się przyciskami **PL / EN / UA** w nagłówku (na telefonie: w menu). Zapisuje się w ciasteczku `rodzice.jezyk`.
- W kodzie używamy `t("polski tekst")`:
  - komponent kliencki: `const t = useT();` z `@/lib/jezyk`,
  - komponent serwerowy: `const t = await tZSerwera();` z `@/i18n/serwer`.
- Tłumaczenia dopisujemy do dwóch słowników: `src/i18n/en.ts` i `src/i18n/uk.ts`. Kluczem jest polski tekst.
- Brak wpisu w słowniku = tekst zostaje po polsku, więc można tłumaczyć po kawałku.
- Zmienne w tekście: `t("Stan na dzień {data}", { data })`.

## Stan na dziś

| Zrobione | Zostało po polsku |
|---|---|
| Nagłówek, menu, stopka, dostępność | Wszystkie sprawy i ich wyniki |
| Strona główna, wyszukiwarka | Kalkulator, kreator, poradnik |
| 404 i ekran błędu | Formularze, druki, wnioski, kalendarz, terminarz |
| `<html lang>`, tytuł strony głównej | Pozostałe podstrony, tytuły kart, daty i liczby |

## Kroki (od najważniejszego)

Po każdym kroku: uruchom aplikację, przełącz na EN i UA, przejdź podstronę do wyniku, sprawdź konsolę i tsc.

### Krok 1. Sprawy (najczęściej używane) ✅ WYKONANE
- Pliki: `src/app/sprawy/page.tsx`, `src/components/Sprawa.tsx`, `src/lib/sprawy.ts` (ok. 75 KB), `src/lib/sprawy-tytuly.ts`, `src/lib/stan-sprawy.ts`, `src/lib/dane-profilu.ts`.
- Zakres: lista spraw, pytania i odpowiedzi, „Po co pytamy?”, „Skąd to wziąć?”, wyniki, kroki „Co teraz zrobić”.
- Uwaga: `sprawy.ts` to moduł nie-React, więc zwraca polskie teksty. Tłumaczyć je przy wyświetlaniu przez `t()`, a nie zmieniać samej logiki.
- Poprawić niespójność: nagłówek `<h1>` sprawy zostaje po polsku, choć okruszek jest przetłumaczony.
- **Zrobione:** lista spraw (`/sprawy`), ekran sprawy (`Sprawa.tsx`: pytania, „Po co pytamy?”, „Skąd to wziąć?”, wyniki, „Co teraz zrobić”, ściągi, tabele, przyciski), `<h1>` i tytuł karty, boczne menu. Tłumaczenia w `src/i18n/sprawy.ts` (jeden wiersz = PL, EN, UK).
- **Jak to działa:** `sprawy.ts` nadal składa zdania po polsku, a `t()` tłumaczy je przy wyświetlaniu. Wpisy z `{a}` są wzorcami (np. „Termin {a} już minął.”), `{a|\d+ dni}` to wzorzec z ograniczeniem. Daty, kwoty, tygodnie i dni w gotowych zdaniach przestawiają się same.
- **Zostaje po polsku (inne kroki):** komunikaty silnika z `/api/oblicz/*` (krok 3), kroki z poradnika w „Co teraz zrobić” (krok 4), opisy organizacji w sprawie „Trudna sytuacja” (krok 7), słowa kluczowe wyszukiwarki (krok 9), tekst wniosku do pracodawcy (zostaje po polsku, oznaczony „Wersja po polsku”).
- Nie sprawdzone w przeglądarce (działający serwer na porcie 3100 to stary build). Sprawdzone: `tsc` i `npm test` (nowy `test/i18n.ts`).

### Krok 2. Daty i liczby ✅ WYKONANE
- Plik: `src/lib/format.ts` (`dataPL`, `miesiacPL`, `liczba`, `tygodnie`, `pln`).
- Dziś na stałe `pl-PL`. Zrobić wersje zależne od języka (`LOCALE` jest już w `src/i18n/jezyki.ts`), uwzględnić liczbę mnogą po ukraińsku i angielsku („tydzień/tygodnie” itd.).
- Ten krok odblokowuje poprawne daty w krokach 1, 3, 5.
- **Zrobione:** `src/i18n/formaty.ts` (`formatyDla(język)`: `pln`, `plOk`, `liczba`, `dataPL`, `miesiacPL`, `dataKrotka`, `tygodnie`, `dni`, `opisObliczenia`, `opisTerminu`; liczba mnoga PL/EN/UK). W komponentach: `const { dataPL, pln } = useFormaty();` (klient) albo `await formatyZSerwera()` (serwer). Stare eksporty z `@/lib/format` zostają po polsku (dla API i testów). Podmienione w: ciaza, dokumenty, pue, wgraj, wnioski, trudne, Glowna, Terminarz, Kalendarz, OsKalendarza, Timeline, kalkulator.

### Krok 3. Kalkulator
- Pliki: `src/app/kalkulator/*` (`Kalkulator`, `Kreator`, `Ojcowski`, `PlanRodziny`, `WyborSytuacji`, `WynikSzczegoly`, `stale.ts`), `src/engine/kalkulator.ts` (opisy wyników i ostrzeżenia), `src/components/OsKalendarza.tsx`, `src/lib/os-kalendarza.ts`.
- Zakres: nazwy kroków, pola, błędy walidacji, wynik, oś czasu, porównanie wariantów.

### Krok 4. Kreator i poradnik
- Pliki: `src/app/kreator/*`, `src/lib/postep-kreatora.ts`, `src/app/poradnik/*`, `src/content/poradnik/drzewo_decyzyjne.json`, `src/content/poradnik/faq.json`, `src/content/poradnik.ts`.
- Zakres: drzewo pytań kreatora, 28 pytań i odpowiedzi poradnika, kroki, źródła prawne.
- Treści prawne: tłumaczenie robić ostrożnie, nazwy przepisów (np. Kodeks pracy, art. …) zostawić, dodać opis w nawiasie.

### Krok 5. Papiery: formularze, druki, wnioski, wgrywanie
- Pliki: `src/app/formularze/page.tsx`, `src/app/druki/page.tsx`, `src/content/poradnik/druki.json`, `src/app/wnioski/page.tsx`, `src/app/wgraj/page.tsx`, `src/lib/urlop-ojcowski.ts`.
- Uwaga: **tekst gotowego wniosku do pracodawcy zostaje po polsku** (to dokument do złożenia w polskiej firmie). Tłumaczymy interfejs i podpowiedzi, a podgląd wniosku oznaczamy „wersja po polsku”. Do potwierdzenia z zespołem.

### Krok 6. Kalendarze i terminy
- Pliki: `src/app/kalendarz/page.tsx`, `src/components/Kalendarz.tsx`, `src/lib/kalendarz.ts`, `data/kalendarz_medyczny.json`, `src/app/terminarz/*`, `src/lib/terminarz/rules.json`, `src/lib/terminarz/widok.ts`, `src/lib/terminarz/terminarz.js`, `src/lib/terminarz/druki-linki.json`.
- Zakres: ok. 390 pozycji kalendarza ciąży i połogu oraz ok. 100 zdań terminarza.
- Uwaga: dane w `data/` i `rules.json` są poza komponentami. Najprościej tłumaczyć je po kluczu (id pozycji) w osobnym pliku, a nie przez polski tekst.

### Krok 7. Pozostałe podstrony
- `/trudne` (`src/app/trudne/*`, `src/lib/wsparcie.ts`, `data/wsparcie.json`): opisy fundacji i linii pomocy; numery telefonów i godziny zostają bez zmian.
- `/ryzyka`, `/ciaza`, `/odpis`, `/o-projekcie`, `/dokumenty` i `src/content/tresci.ts`.
- `/logowanie`, `/pue`, `/admin` (`src/app/logowanie/Logowanie.tsx`, `src/app/pue/page.tsx`, `src/app/admin/page.tsx`, `src/lib/zus-mock.ts`, `data/personas/P*.json`).
- `/admin` może zostać tylko po polsku (narzędzie wewnętrzne). Do decyzji.

### Krok 8. Tytuły kart przeglądarki
- Pliki: statyczne `metadata` w `src/app/*/layout.tsx` (kalkulator, kreator, dokumenty, ciaza, poradnik, logowanie, o-projekcie, odpis, pue, ryzyka, trudne, wgraj, wnioski, admin, terminarz).
- Zamienić na `generateMetadata()` z `tZSerwera()`, tak jak w `src/app/layout.tsx`.

### Krok 9. Wygląd i drobiazgi
- Cyrylica: Lato nie ma jej w Google Fonts, więc ukraińskie litery idą czcionką zastępczą. Dodać drugą czcionkę z cyrylicą (np. Noto Sans, subset `cyrillic`) jako zapasową w `src/app/layout.tsx` i `globals.css`.
- Wyszukiwarka (`src/lib/sprawy.ts`, `szukaj`) dopasowuje tylko polskie słowa. Dodać słowa kluczowe EN/UK albo tłumaczyć zapytanie.
- Sprawdzić długie napisy w menu i nagłówku po EN/UK na szerokościach 375, 768, 1024 i 1440 px.
- Przełącznik przy ok. 1024 px jest tylko w menu. Rozważyć pokazanie go w nagłówku.
- Dane z API po zalogowaniu (opisy person, komunikaty z `/api/zus/*`, np. „Wniosek matki o uśrednioną stawkę zasiłku”): tłumaczyć po stronie klienta albo zwracać kody zamiast tekstu.

### Krok 10. Kontrola jakości
- Ponownie uruchomić audyt (subagent): każda trasa w EN i UK, porównanie z wersją PL.
- Przejrzeć tłumaczenia ukraińskie i angielskie pod kątem języka urzędowego (najlepiej przez osobę znającą język).
- Dodać test: każdy klucz w `en.ts` i `uk.ts` istnieje w obu słownikach i nie ma pustych wartości.

## Do decyzji

1. Czy tekst wniosku do pracodawcy ma zostać po polsku (zalecane)?
2. Czy panel `/admin` tłumaczyć?
3. Kto sprawdza jakość tłumaczeń prawniczych po ukraińsku?
