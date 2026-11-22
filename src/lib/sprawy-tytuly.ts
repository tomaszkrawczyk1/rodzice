/**
 * Tytuły spraw potrzebne w nagłówku (okruszki). Nagłówek jest na każdej stronie, a cały moduł `sprawy.ts`
 * (pytania, reguły, treści) waży ok. 130 KB po zbudowaniu, więc nagłówek nie może go importować.
 * Zgodność z `sprawy.ts` pilnuje test/ux.ts.
 */
export const TYTULY_SPRAW: Record<string, string> = {
  "co-przysluguje": "Sprawdzić, co mi przysługuje",
  "zwolnienie-ciaza": "Zwolnienie w ciąży – ile dostanę",
  "wniosek-zasilek": "Złożyć wniosek o zasiłek po porodzie",
  "urlop-pracodawca": "Poprosić pracodawcę o urlop",
  "podzial-urlopu": "Podzielić urlop z partnerem",
  "praca-na-urlopie": "Pracować w czasie urlopu rodzicielskiego",
  "adopcja": "Adopcja lub rodzina zastępcza",
  "trudna-sytuacja": "Trudna sytuacja: strata, wcześniak, śmierć matki",
  "terminy": "Sprawdzić terminy, których nie mogę przegapić",
  "odpis-aktu": "Zdobyć odpis aktu urodzenia",
};
