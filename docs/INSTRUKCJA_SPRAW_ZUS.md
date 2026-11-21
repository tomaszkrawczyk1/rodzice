# Jak sprawdzić silnik na przykładowych sprawach ZUS (lokalnie, bez udostępniania)

Dokumentów ZUS nie wolno rozpowszechniać — dlatego **nie wysyłaj ich nikomu (ani do czatu AI)**. Ten sposób działa tylko na Twoim komputerze.

## Kroki

1. Weź jedną sprawę ZUS. Znajdź w niej: miesięczne wynagrodzenia (tabela w Z-3 / Z-3a), daty (poród/przyjęcie dziecka, okresy urlopów), liczbę dzieci i **decyzję/kwoty ZUS** (podstawa, kwota za okres).
2. Skopiuj `silnik/szablon_sprawy.json` do `moje_sprawy/sprawa01.json`. Zamień dane na dane ze sprawy. Pola, których nie masz — usuń.
3. Uruchom:
   ```powershell
   cd silnik
   node sprawdz_sprawy.ts
   ```
4. Czytaj wynik:
   - `OK` — silnik zgadza się z ZUS (tolerancja 1 zł).
   - `RÓŻNICA` — jest rozbieżność. Patrz niżej.

## Jak szukać przyczyny różnicy

| Co się rozjechało | Najczęstsza przyczyna |
|---|---|
| **Podstawa** (miesięczna) | Brakujące wyjątki: miesiąc z <½ czasu pracy, zmiana etatu, składniki terminowe, inny % składki w Z-3 kol. 9 (`LUKI_I_DECYZJE.md` B5, B6). |
| Podstawa się zgadza, **kwota o kilka zł** | Zaokrąglenia (`LUKI_I_DECYZJE.md` C1) — zmieniasz tylko funkcję `kwotaOkresu` w `kalkulator.ts`. |
| **Liczba dni** inna | Dzień porodu liczony jako dzień 1 (C2), podział na części, przejęcie przez ojca. |
| **Wariant 81,5 %** | Czy w sprawie jest zaznaczone pole w ZAM; część ojca (C3). |

Trik: jeśli podasz **tylko podstawę ZUS** (bez miesięcy), narzędzie użyje jej i sprawdzi **sam plan** — od razu widać, czy błąd jest w podstawie, czy w planie.

## Co z wynikami

- Wyniki zostają u Ciebie. Gdy znajdziesz rozbieżność, opisz ją ogólnie (np. „kwota za rodzicielski o 3,20 zł mniejsza, 224 dni, podstawa się zgadza”) — **bez danych osobowych i bez kopiowania dokumentu** — i wtedy mogę pomóc ją wyjaśnić.
- Jeśli rozbieżności są systematyczne, popraw silnik i dopisz **własny, zanonimizowany** przypadek do `testy.ts`.
- Folder `moje_sprawy/` ma `.gitignore` — nie trafi do repozytorium.
