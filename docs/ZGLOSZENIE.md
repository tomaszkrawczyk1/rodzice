# Pakiet zgłoszeniowy – HackTribe

**Tytuł:** Przewodnik Przyszłego Rodzica
**Demo:** https://zxcvbnms.dev · **Repozytorium:** https://github.com/tomaszkrawczyk1/rodzice

## Opis projektu (do formularza)
Przewodnik Przyszłego Rodzica to aplikacja webowa, która zamiast kazać szukać w przepisach, prowadzi rodzica krok po kroku:
co mu przysługuje w ciąży i po porodzie, ile pieniędzy dostanie, na jak długo, gdzie złożyć dokumenty i na co uważać.
Obejmuje zasiłek chorobowy w ciąży, świadczenie rehabilitacyjne, zasiłek w wysokości macierzyńskiego oraz zintegrowany kalkulator zasiłku
macierzyńskiego: dla matki, ojca i obojga rodziców (podział urlopu rodzicielskiego z regułą 9 tygodni), z łączeniem pracy z urlopem
(do ½ etatu), dla adopcji i rodziny zastępczej (limity wieku 7/10/14 lat), wcześniaków (uzupełniający urlop), ciąży mnogiej i dziecka
z zaświadczeniem „Za życiem”. Pokazuje oś czasu urlopów, porównuje wariant 100%/70% z 81,5% i wskazuje, czy zasiłek wypłaca pracodawca czy ZUS,
jaki druk złożyć i w jakim terminie. Ostrzega o ryzykach (brak ubezpieczenia w dniu porodu, pozorna umowa, zadłużenie składkowe, spóźniony wniosek)
i ma osobną, delikatną ścieżkę dla trudnych sytuacji z listą organizacji wsparcia.
Aplikacja symuluje logowanie mObywatelem, dane z ZUS, e-ZLA, zadłużenie składkowe, konto PUE, odpis aktu i wysyłanie wniosków.
Panel administratora pozwala zmieniać stawki, wymiary i terminy bez programisty, więc narzędzie nadąża za zmianami przepisów.

## Użycie AI (wymagane wskazanie)
- **Parser wniosków (`/wgraj`)**: DeepSeek V4.1 Flash (DeepInfra) z rozpoznawaniem obrazu odczytuje skany ZAM, Z-3, Z-3a i decyzji do schematu JSON:
  najpierw klasyfikuje strony, potem odczytuje pola. Wynik przechodzi walidację w kodzie (suma kontrolna PESEL, spójność dat, kompletność 12 miesięcy), a użytkownik go potwierdza.
- **Silnik obliczeń nie używa AI.** Kwoty i okresy liczy deterministyczny kod z parametrami z przepisów (76 testów). Każdy wynik pokazuje kroki obliczeń.
- AI wspierało też przygotowanie bazy reguł z przepisów (z automatyczną weryfikacją cytatów) i pisanie kodu.

## Wyróżniki
1. Wynik zawsze z krokami i podstawą – jury może sprawdzić każdą liczbę.
2. AI tylko tam, gdzie jest sensowne (odczyt skanów), a nie przy kwotach.
3. Parametry z przepisów w jednym pliku edytowanym w panelu admina (gotowość na zmianę przepisów).
4. Parser działa na skanach z kopiarki: pomija puste strony i czyta tylko istotne (ok. 9 tys. tokenów na sprawę ~20-stronicową).
5. Twarde limity kosztów (proxy 100 zapytań / 1 mln tokenów), prawdziwy klucz poza repozytorium.

## Scenariusz filmu (≤ 3 min)
1. (0:00–0:15) Problem: rodzice nie wiedzą, co im przysługuje. Strona główna, zaloguj mObywatelem (symulacja), wybór profilu.
2. (0:15–0:50) „W ciąży”: uprawnienia i dlaczego (np. zleceniobiorczyni bez chorobowego → brak zasiłku + alternatywa).
3. (0:50–1:40) Kalkulator: oboje rodzice, suwaki podziału urlopu, łączenie z pracą, oś czasu, porównanie 81,5%.
4. (1:40–2:20) Wgraj wniosek: dokument demo Z-3 → AI odczytuje 12 miesięcy → kod liczy podstawę 5 608,85 zł → kalkulator.
5. (2:20–2:45) Dokumenty i terminy, ryzyka, trudne sytuacje.
6. (2:45–3:00) Panel admina (zmiana parametru), podsumowanie: silnik bez AI, 76 testów, twarde limity.

