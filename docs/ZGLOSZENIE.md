# Przewodnik Przyszłego Rodzica · prototyp

**Zespół HackTribe** · HackNation 2026 · wyzwanie ZUS „Zasiłkowy Przewodnik Przyszłego Rodzica”

[Demo aplikacji](https://zxcvbnms.dev) · [Repozytorium kodu](https://github.com/tomaszkrawczyk1/rodzice)

## Opis projektu

Przewodnik pomaga przyszłym rodzicom i rodzicom małych dzieci ustalić, jakie świadczenia mogą im przysługiwać, ile mogą otrzymać i co złożyć do ZUS lub pracodawcy. Strona główna zaczyna od pytania „Co chcesz załatwić?”. Po wyborze etapu pokazuje trzy pasujące sprawy. Można też opisać sprawę własnymi słowami i przeszukać poradnik. Interfejs korzysta z palety inspirowanej serwisem ZUS.

W aplikacji jest dziesięć ścieżek spraw. Prowadzą m.in. przez sprawdzenie uprawnień w ciąży, przygotowanie wniosku po porodzie, podział urlopu, łączenie go z pracą, adopcję i sprawdzenie terminów. Ścieżki z formularzem zadają po jednym pytaniu. W zależności od sprawy wynik zawiera kwotę i okres, kolejne kroki, wskazówki do druku albo tekst wniosku do skopiowania. Moduł trudnych sytuacji pokazuje nazwy i opisy organizacji, które wymagają weryfikacji przed kontaktem.

Zintegrowany kalkulator pokazuje okresy i kwoty dla rodziców na osi czasu i w tabeli. Porównuje warianty wypłaty i pozwala wczytać scenariusz testowy. Symulowane logowanie mObywatelem otwiera dostęp do fikcyjnych danych o ubezpieczeniu, zwolnieniach i zadłużeniu. Dane profilu mogą wypełnić część pól w ścieżce. Jeśli w scenariuszu jest przyszły termin, strona główna go wyróżnia. PUE/eZUS, wysłanie wniosków i zamówienie odpisu aktu urodzenia również są symulowane.

Moduł „Wgraj wniosek” pokazuje odczyt pól ze skanu, a dla dokumentu z danymi o wynagrodzeniu wylicza podstawę wymiaru i przekazuje ją do kalkulatora. W demo można wybrać syntetyczny PDF. Panel administratora pozwala zmienić zapisane stawki, wymiary i terminy. Webhook po pushu do `main` uruchamia testy i budowanie aplikacji na serwerze, po czym wdraża nową wersję z zachowaniem parametrów zmienionych w panelu.

## Oświadczenie o użyciu AI

W działającej aplikacji DeepSeek V4.1 Flash służy wyłącznie do klasyfikowania stron i odczytywania pól ze skanów w module „Wgraj wniosek”. Aplikacja wywołuje model w DeepInfra przez własne proxy. Kod sprawdza odczytane dane i liczy podstawę wymiaru, kwoty i okresy. Kod i treści projektu tworzono z pomocą modeli, w tym Claude, GPT, Grok i Gemini.

Jeden rzeczywisty skan wysłano do DeepInfra przed poznaniem zasady zakazującej przekazywania dokumentów ZUS do zewnętrznych usług.

## Materiały

- [Prezentacja](prezentacja.pptx) zawiera 10 slajdów.
- [Zrzut kalkulatora](screenshots/kalkulator.jpg) i [zrzut modułu odczytu](screenshots/wgraj-wniosek-ai.jpg) pokazują te dwa moduły.
- [Pliki testowe PDF](../public/demo/) zawierają wyłącznie dane syntetyczne.
- W pakiecie brakuje publicznego linku do filmu do 3 minut.
- [Macierz zgodności](ZGODNOSC_Z_WYMAGANIAMI.md) i [lista braków](BRAKI.md) opisują stan prototypu.

## Scenariusz filmu do 3 minut

| Czas | Co pokazać |
|---|---|
| 0:00–0:25 | Strona główna, wybór etapu i trzy sprawy. Wyszukaj pytanie „ile dostanę po porodzie”. |
| 0:25–0:55 | Symulowane logowanie i ekran danych ZUS. Otwórz ścieżkę uprawnień, zatwierdź dane profilu i pokaż wynik. |
| 0:55–1:35 | W kalkulatorze pokaż podział między rodziców, oś czasu i porównanie wariantów. |
| 1:35–2:20 | Wybierz syntetyczny Z-3. Pokaż odczyt, komunikat o symulacji ubezpieczenia i przeniesienie podstawy do kalkulatora. |
| 2:20–2:50 | Pokaż podgląd wniosku i wskaż panel administratora. |
| 2:50–3:00 | Wyświetl adres demo, repozytorium i informację o użyciu AI. |
