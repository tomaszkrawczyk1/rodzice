# Design: bliżej zus.pl (bez udawania, że to ZUS)

Kolory i fonty poniżej **zmierzyłem na żywej stronie głównej zus.pl** (odczyt stylów obliczonych w przeglądarce, 2026-11-21). Zmierzyłem tylko stronę główną — podstron (np. kalkulatorów) nie, więc to punkt wyjścia, nie pełny design system. Zrzut Twojej strony (granatowy gradient w hero, zaokrąglone karty, zielone przyciski) ocenia się bez dostępu do kodu; po podłączeniu rozszerzenia Chrome sprawdzę, jak jest zrobione naprawdę.

## Paleta (zmierzona)

> **Decyzja (aktualizacja):** w naszej aplikacji pomarańcz z zus.pl NIE jest używany. Główne przyciski, chipy i akcenty są zielone (`--zus-green` #007834, hover `--zus-green-dark` #025a28), obramowania i drugorzędne przyciski granatowe (`--zus-navy`), fokus granatowy z białą przerwą. Bursztyn zostaje wyłącznie jako kolor ostrzeżeń (`--zus-warn*` w `src/app/globals.css`). Tryb wysokiego kontrastu używa jasnej zieleni `--hc-accent` na czerni. Tokeny są zdefiniowane w `:root` w `globals.css`.

| Rola | Kolor | Gdzie na zus.pl |
|---|---|---|
| Zieleń ZUS (podstawowa) | `#007834` | pasek nad kafelkami, aktywny kafelek, logo |
| Zieleń linków / nawigacji | `#11783B` | linki, menu główne (Świadczenia, Firmy, …) |
| Granat | `#00416E` | obramowanie i tekst przycisków, ikony dostępności |
| Pomarańcz (akcja główna) | `#FAB856` + tekst granatowy | przycisk „Zaloguj do PUE/eZUS” |
| Grafit | `#283754` | duże ciemne sekcje |
| Tło jasne | `#F3F3F3` | pasy/tła sekcji |
| Biel, czerń | `#FFFFFF`, `#000000` | tło strony, tekst |

Kontrast (policzony): biały tekst na `#007834` ≈ 5,6:1; granatowy na `#FAB856` ≈ 6,1:1; `#11783B` na bieli ≈ 5,5:1 – wszystkie spełniają AA.

## Typografia i kształty
- **Font: Lato** (na zus.pl „Lato Regular”). Wczytaj z Google Fonts (Lato 400/700), fallback Helvetica/Arial.
- Rozmiar bazowy na zus.pl to 14 px; **zalecam 16 px** (czytelność na telefonie).
- Przyciski: **promień 3 px**, obramowanie 1 px granatowe, bez cieni. (U Ciebie karty mają duży promień – to najmocniej odróżnia stronę od ZUS.)
- Nagłówki: czarne/grafitowe na białym tle, pogrubione; **bez gradientu w hero**.

## Układ (z zus.pl)
1. **Biały nagłówek**: po lewej logo (zielone) + napis „Zakład Ubezpieczeń Społecznych”; po prawej rząd narzędzi (kontakt, język, dostępność) i przyciski: **obrys granatowy** (rejestracja) i **pomarańczowy** (logowanie).
2. **Poziome menu pod logo**, zielone linki, rozłożone równo, bez tła (jasne separatory).
3. **Hero biały**: duży czarny nagłówek po lewej, krótki tekst, **zdjęcie po prawej** z kółkowymi strzałkami karuzeli (zielony obrys).
4. **Gruba zielona linia** (`#007834`) i pod nią **rząd kafelków** na białym tle, tekst zielony; kafelek aktywny: zielone tło + biały tekst.
5. Dużo bieli, jasnoszare pasy, mało dekoracji.

## Jak to przełożyć na Twoją stronę (z zrzutu)
| Teraz | Zmień na |
|---|---|
| Granatowo-turkusowy gradient w hero | Biały hero, czarny nagłówek, zielona linia pod spodem |
| Zielony przycisk „Policz zasiłek” i biały „Zaloguj przez mObywatela” | „Policz zasiłek”: zielony `#007834`, biały tekst, promień 3 px. „Zaloguj przez mObywatela”: **pomarańczowy `#FAB856`, granatowy tekst** (jak „Zaloguj do PUE/eZUS”) |
| Menu: pogrubione ciemne linki, „Start” w ramce | Menu: zielone linki `#11783B`, aktywny element: zielone tło + biały tekst albo zielone podkreślenie |
| Karty z dużym promieniem i cieniem | Karty: prawie prostokątne (promień 3 px), obrys `#D9D9D9`, bez cienia, tło białe na `#F3F3F3` |
| Wielki gradientowy blok jako baner | Sekcja jasnoszara `#F3F3F3` z granatowym nagłówkiem |

## Zasady, żeby nie wyglądało jak podróbka
- To **inspiracja stylem**, nie kopia: nie używaj logo ZUS ani jego pełnej nazwy jako własnej marki aplikacji. Zostaw nazwę własną („Przewodnik Przyszłego Rodzica”) i dopisek, że to prototyp na HackNation. Ewentualne logo/elementy ZUS – tylko po sprawdzeniu zasad na stronie ZUS.
- Dostępność jak na zus.pl: widoczny fokus, kontrasty AA, przełącznik wielkości tekstu i wysokiego kontrastu (na zus.pl są ikony dostępności w nagłówku).

## Tokeny CSS
Plik: `zus-tokens.css` (w tym folderze). Wystarczy go zaimportować i użyć zmiennych `--zus-*`.
