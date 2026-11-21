# Przewodnik Przyszłego Rodzica · prototyp

Aplikacja webowa przygotowana na HackNation 2026 jako odpowiedź na wyzwanie ZUS „Zasiłkowy Przewodnik Przyszłego Rodzica”. Pomaga sprawdzić uprawnienia, oszacować zasiłek i przygotować dokumenty. Wyliczenia są orientacyjne. Logowanie mObywatelem oraz połączenia z ZUS, PUE/eZUS i USC są symulowane z użyciem fikcyjnych danych.

[Otwórz demo](https://zxcvbnms.dev) · [Opis zgłoszenia](docs/ZGLOSZENIE.md) · [Macierz zgodności](docs/ZGODNOSC_Z_WYMAGANIAMI.md) · [Lista braków](docs/BRAKI.md)

## Jak korzystać

Na stronie głównej „Co chcesz załatwić?” wybierz etap: planowanie dziecka, ciążę albo czas po urodzeniu. Zobaczysz trzy pasujące sprawy. Możesz też opisać sprawę własnymi słowami, a wyszukiwarka podpowie ścieżki i pytania z poradnika. Po zalogowaniu strona pokazuje dane profilu testowego i najbliższy termin, jeśli taki wynika ze scenariusza.

- **Sprawy** (`/sprawy`) to 10 ścieżek: uprawnienia, zwolnienie w ciąży, wniosek po porodzie, urlop u pracodawcy, podział urlopu, praca na urlopie, adopcja lub rodzina zastępcza, trudna sytuacja, terminy i odpis aktu urodzenia. W ścieżkach z formularzem odpowiadasz na jedno pytanie na ekranie. Wynik może zawierać listę kroków, wskazówki do druku lub tekst wniosku do skopiowania.
- **Kalkulator** (`/kalkulator`) pokazuje okresy, kwoty i oś czasu. Ma tryby „Matka”, „Oboje rodzice”, „Praca + urlop rodzicielski”, „Adopcja / rodzina zastępcza” i „Moje dane / przykładowa sprawa”. Można wpisać zarobki lub gotową podstawę, wczytać fikcyjny scenariusz albo przejść z odczytanego skanu.
- **Poradnik, druki i wnioski** (`/poradnik`, `/druki`, `/dokumenty`, `/wnioski`) pomagają ustalić, jaki dokument przygotować i do kogo go skierować. Kreator pokazuje podgląd i potwierdzenie symulowanego wysłania. Szczegóły świadczeń w ciąży są pod `/ciaza`, a ryzyka i wsparcie w trudnych sytuacjach pod `/ryzyka` i `/trudne`.
- **Wgraj wniosek** (`/wgraj`) pokazuje pola odczytane ze skanu. Jeśli w dokumencie odczytano dane potrzebne do obliczenia podstawy, można przenieść wynik do kalkulatora. Do demonstracji służą syntetyczne PDF-y dostępne na stronie.

Interfejs korzysta z palety inspirowanej serwisem ZUS. Na telefonie nawigacja rozwija się z przycisku „Menu”.

## Uruchomienie i testy

```bash
npm ci
npm run dev
```

Aplikacja działa domyślnie na `http://localhost:3100`. Ustawienia środowiska są w [`.env.example`](.env.example). Parser PDF wymaga `pdftoppm` z pakietu `poppler-utils`.

```bash
npm test
npm run weryfikuj
npm run build
npx tsc --noEmit
```

## Architektura i wdrożenie

- Next.js 16 i TypeScript. Strony i REST API są w [`src/app/`](src/app/).
- [Silnik obliczeń](src/engine/kalkulator.ts) korzysta z [parametrów](data/parametry.json). Panel `/admin` pozwala zmieniać zapisane parametry, takie jak stawki, wymiary i terminy. [Baza reguł](data/baza_regul.json) dokumentuje reguły.
- GitHub Actions uruchamia testy, weryfikację poradnika i kompilację. Osobny [webhook](deploy/hook.mjs) reaguje na push do `main`. [Skrypt serwerowy](deploy/deploy-server.sh) pobiera kod, sprawdza go, buduje wersję standalone i restartuje usługi systemd. Zachowuje plik parametrów edytowany w panelu. Caddy kieruje ruch do aplikacji, webhooka i proxy LLM.
- [Proxy LLM](proxy/llm-proxy.mjs) ma domyślny limit 100 zapytań i 1 000 000 tokenów łącznie. Klucz DeepInfra jest ustawiany w środowisku proxy.

## Oświadczenie o użyciu AI

W działającej aplikacji DeepSeek V4.1 Flash służy wyłącznie do klasyfikowania stron i odczytywania pól ze skanów w module „Wgraj wniosek”. Aplikacja wywołuje model w DeepInfra przez własne proxy. Dane z odczytu sprawdza kod, a kwoty i okresy wylicza deterministyczny silnik. Kod i treści projektu tworzono z pomocą modeli, w tym Claude, GPT, Grok i Gemini.

Jeden rzeczywisty skan wysłano do DeepInfra przed poznaniem zasady zakazującej przekazywania dokumentów ZUS do zewnętrznych usług.

Do prób używaj plików syntetycznych. Przykłady z [`public/demo/`](public/demo/) wygenerowano [skryptem](scripts/generuj_demo.py) z fikcyjnymi danymi.
