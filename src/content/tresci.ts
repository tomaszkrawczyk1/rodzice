// Treści statyczne aplikacji. Liczby i terminy z przepisów są w parametry.json (panel admina) – tu tylko opisy.
export const DRUKI = [
  { kod: "ZAM", nazwa: "Wniosek o zasiłek macierzyński", opis: "Od 24 października 2026 r. ten jeden formularz zastępuje dawne wnioski ZAM, ZUR i ZAO (o zasiłek macierzyński, rodzicielski i ojcowski). Wybierzesz w nim też wariant wypłaty 81,5%.", kto: "Każdy ubezpieczony; składasz pracodawcy (jeśli zatrudnia powyżej 20 osób) albo bezpośrednio do ZUS" },
  { kod: "Z-3", nazwa: "Zaświadczenie płatnika składek (pracownik)", opis: "Jeśli pracodawca zatrudnia do 20 osób, przesyła do ZUS ten formularz z danymi o Twoich zarobkach i urlopie. Na tej podstawie ZUS wylicza i wypłaca zasiłek.", kto: "Pracodawca (wysyła do ZUS)" },
  { kod: "Z-3a", nazwa: "Zaświadczenie płatnika składek (zlecenie i inne)", opis: "Dla osób pracujących na umowie zlecenia lub w innej formie niż etat, gdy zasiłek wylicza i wypłaca ZUS.", kto: "Płatnik składek / zleceniodawca (wysyła do ZUS)" },
  { kod: "e-ZLA", nazwa: "Elektroniczne zwolnienie lekarskie", opis: "Wystawia lekarz w systemie elektronicznym. Trafia automatycznie do ZUS i na profil Twojego pracodawcy. W ciąży ma kod „B” (płatne 100%).", kto: "Lekarz" },
  { kod: "ZUA", nazwa: "Zgłoszenie do ubezpieczeń (dobrowolne chorobowe)", opis: "Zgłoszenie do dobrowolnego ubezpieczenia chorobowego (dla zleceniobiorców i przedsiębiorców). Pamiętaj: ubezpieczenie chroni dopiero od dnia zgłoszenia, nie wstecz.", kto: "Zleceniobiorca lub przedsiębiorca (do ZUS)" },
  { kod: "Odpis aktu", nazwa: "Odpis skrócony aktu urodzenia", opis: "ZUS zazwyczaj pobiera go sam z rejestru stanu cywilnego. Jeśli zajdzie potrzeba, wniosek złożysz w urzędzie stanu cywilnego lub przez internet.", kto: "Urząd stanu cywilnego" },
  { kod: "Wniosek o urlop", nazwa: "Wniosek do pracodawcy o urlop macierzyński, rodzicielski lub ojcowski", opis: "Pismo do pracodawcy o udzielenie urlopu. Złóż je z wyprzedzeniem wymaganym przez Kodeks pracy (np. przy urlopie rodzicielskim: co najmniej 21 dni przed rozpoczęciem).", kto: "Pracownik (do pracodawcy)" },
];

export const RYZYKA = [
  { t: "Brak ubezpieczenia chorobowego w dniu porodu", d: "Zasiłek macierzyński przysługuje tylko wtedy, gdy w dniu porodu masz aktywne ubezpieczenie chorobowe. Zakończenie umowy przed porodem, koniec zlecenia lub brak zgłoszenia do dobrowolnego chorobowego oznaczają brak zasiłku (wyjątki: upadłość lub likwidacja pracodawcy, prawomocny wyrok sądu).", sev: "danger" },
  { t: "Potwierdzenie wykonywania pracy", d: "ZUS może sprawdzić, czy praca z umowy lub działalności była rzeczywiście wykonywana. Gdy potwierdzi, że umowa lub działalność była fikcyjna, może odmówić zasiłku.", sev: "danger" },
  { t: "Zmiana podstawy składek", d: "ZUS może sprawdzić, skąd wynika zmiana kwoty, od której opłacasz składki. Jeśli ustali niższą podstawę, kwota zasiłku może się zmienić.", sev: "danger" },
  { t: "Zadłużenie w składkach (własna firma)", d: "Jeśli w dniu porodu Twoje zaległości w ZUS przekraczają 1% minimalnego wynagrodzenia, wypłata zasiłku zostaje wstrzymana do momentu spłaty całego długu. Masz na to 6 miesięcy, inaczej prawo do zasiłku za dany okres przedawni się.", sev: "danger" },
  { t: "Złożenie wniosku o wariant 81,5% po terminie", d: "Wniosek o równą kwotę zasiłku (81,5% przez cały czas) musisz złożyć najpóźniej w ciągu 21 dni po porodzie. Po tym terminie obowiązuje wariant standardowy (100% za macierzyński, 70% za rodzicielski).", sev: "warn" },
  { t: "Niewykorzystanie 9 tygodni przez drugiego rodzica", d: "Każdy rodzic ma wyłączne prawo do 9 tygodni urlopu rodzicielskiego, których nie można przenieść na partnera. Jeśli drugi rodzic z nich nie skorzysta, te tygodnie przepadają. Zasiłek za tę część wynosi zawsze 70%.", sev: "warn" },
  { t: "Łączenie pracy z urlopem rodzicielskim", d: "Możesz pracować maksymalnie na ½ etatu i tylko u pracodawcy, który udzielił Ci urlopu. Zasiłek zmniejsza się wtedy proporcjonalnie do wymiaru czasu pracy. Pracodawca może odmówić tylko z ważnych przyczyn organizacyjnych (powiadomi Cię w ciągu 7 dni).", sev: "warn" },
  { t: "Przerwa w ubezpieczeniu lub zmiana pracy", d: "Przerwa w ubezpieczeniu do 30 dni nie przerywa ciągłości. Dłuższa przerwa sprawia, że okres wyczekiwania na zasiłek chorobowy (30 dni przy etacie, 90 dni przy dobrowolnym chorobowym) liczy się od początku.", sev: "warn" },
  { t: "Przedawnienie roszczenia o zasiłek", d: "Prawo do zasiłku przedawnia się po 6 miesiącach od ostatniego dnia okresu, za który zasiłek przysługiwał.", sev: "warn" },
  { t: "Wyrejestrowanie z dobrowolnego ubezpieczenia chorobowego", d: "Osoby na dobrowolnym chorobowym są wyrejestrowywane z tego ubezpieczenia na czas pobierania zasiłku macierzyńskiego. To standardowa procedura, ale pamiętaj o ponownym zgłoszeniu, gdy zasiłek się skończy.", sev: "info" },
];

export const OCHRONA = [
  "Od początku ciąży do końca urlopu macierzyńskiego i rodzicielskiego pracodawca nie może wypowiedzieć ani rozwiązać Twojej umowy o pracę (Kodeks pracy, art. 177).",
  "Ochrona obowiązuje także od dnia złożenia wniosku o urlop macierzyński, rodzicielski, ojcowski lub uzupełniający – dotyczy to w równym stopniu obojga rodziców.",
  "Wyjątki: ciężkie naruszenie obowiązków pracowniczych (tzw. zwolnienie dyscyplinarne) za zgodą zakładowej organizacji związkowej oraz ogłoszenie upadłości lub likwidacja pracodawcy.",
  "Umowa o pracę na czas określony lub na okres próbny dłuższy niż miesiąc, która rozwiązałaby się po upływie 3. miesiąca ciąży, przedłuża się automatycznie do dnia porodu.",
  "Kodeksowa ochrona przed zwolnieniem dotyczy pracowników zatrudnionych na umowę o pracę. Umowy zlecenia i działalność gospodarcza nie podlegają przepisom Kodeksu pracy o trwałości stosunku pracy.",
];

export const TRUDNE = [
  { id: "martwe", t: "Dziecko urodziło się martwe", d: ["Przysługuje Ci zasiłek macierzyński za 8 tygodni po porodzie (100% podstawy).", "Wniosek składasz tak samo jak przy porodzie; potrzebny jest odpis skrócony aktu urodzenia z adnotacją o martwym urodzeniu albo zaświadczenie lekarskie."] },
  { id: "zgon", t: "Dziecko zmarło po urodzeniu", d: ["Gdy dziecko zmarło przed ukończeniem 8 tygodni życia: zasiłek przysługuje za 8 tygodni po porodzie, nie krócej niż 7 dni od dnia zgonu.", "Gdy dziecko zmarło później: zachowujesz prawo do zasiłku przez 7 dni od dnia zgonu.", "W przypadku ciąży mnogiej wymiar urlopu i zasiłku ustala się stosownie do liczby dzieci pozostałych przy życiu."] },
  { id: "wczesniak", t: "Dziecko urodziło się przedwcześnie lub wymaga pobytu w szpitalu", d: ["Przysługuje uzupełniający urlop macierzyński: tydzień za każdy tydzień pobytu dziecka w szpitalu (do 8 lub 15 tygodni – w zależności od tygodnia ciąży i masy urodzeniowej).", "Wniosek składasz u pracodawcy najpóźniej 21 dni przed końcem urlopu macierzyńskiego, dołączając zaświadczenie ze szpitala.", "Rodzicom dziecka z zaświadczeniem „Za życiem” przysługuje dłuższy urlop rodzicielski (65 lub 67 tygodni)."] },
  { id: "matka", t: "Śmierć, ciężka choroba matki lub porzucenie dziecka", d: ["Ojciec dziecka może przejąć niewykorzystaną część urlopu macierzyńskiego jeszcze przed upływem 14 tygodni od porodu.", "Dotyczy to także sytuacji, gdy matka przebywa w szpitalu i nie może opiekować się dzieckiem albo ma orzeczoną niezdolność do samodzielnej egzystencji.", "Wymagane dokumenty: oświadczenie o sytuacji, akt zgonu lub zaświadczenie ze szpitala oraz odpis aktu urodzenia dziecka."] },
  { id: "ciaza", t: "Zagrożona ciąża lub poronienie", d: ["Elektroniczne zwolnienie lekarskie w ciąży (kod „B”) daje prawo do zasiłku chorobowego w wysokości 100% podstawy wymiaru, nawet do 270 dni.", "Jeśli po poronieniu potrzebujesz wsparcia, poniżej znajdziesz organizacje, które mogą pomóc.", "W razie pytań o szczegóły świadczeń w Twojej sytuacji możesz wysłać zapytanie do ZUS przez portal PUE / eZUS."] },
];

export const WSPARCIE = [
  { nazwa: "Fundacja Wcześniak Rodzice-Rodzicom", opis: "Organizacja pożytku publicznego (KRS 0000191989) pomagająca rodzicom dzieci urodzonych przed 36. tygodniem ciąży: bezpłatna wypożyczalnia sprzętu medycznego, poradnik „Niezbędnik rodzica wcześniaka”.", dla: ["wczesniak"] },
  { nazwa: "Fundacja Medycyny Prenatalnej im. Ernesta Wójcickiego", opis: "Organizacja pożytku publicznego (KRS 0000789473): bezpłatne wsparcie psychologiczne, prawne i diagnostyczne po poronieniu i martwym urodzeniu.", dla: ["martwe", "ciaza"] },
  { nazwa: "Fundacja Warszawskie Hospicjum dla Dzieci – Hospicjum Perinatalne", opis: "Wszechstronne wsparcie psychologiczne, medyczne i socjalne dla rodziców w trudnej diagnozie prenatalnej i w żałobie.", dla: ["zgon", "martwe", "wczesniak"] },
  { nazwa: "Fundacja Panda Team im. Michałka Tarachowicza", opis: "Grupy wsparcia dla rodziców po stracie dziecka oraz pomoc terapeutyczna dla rodzeństwa w żałobie.", dla: ["zgon", "martwe"] },
  { nazwa: "Fundacja Rodzić po Ludzku", opis: "Wsparcie w poszanowaniu praw pacjenta oraz bezpłatny przewodnik „Poronienie i urodzenie martwego dziecka w szpitalu”.", dla: ["martwe", "ciaza"] },
];
export const WSPARCIE_UWAGA = "Zestawienie organizacji pozarządowych i grup wsparcia. Zanim skorzystasz z pomocy, sprawdź aktualne dane kontaktowe bezpośrednio na stronie wybranej organizacji.";

export const LINKI = [
  ["ZUS – świadczenia dla rodziców", "https://www.zus.pl/swiadczenia/macierzynstwo"],
  ["gov.pl – urlop rodzicielski", "https://www.gov.pl/web/rodzina/urlop-rodzicielski"],
  ["Państwowa Inspekcja Pracy – rodzicielstwo", "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo"],
  ["Rejestr stanu cywilnego – odpis aktu", "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego"],
] as const;

export const PERSONA_OPIS: Record<string, string> = {
  P01: "Pracownica, firma 80 osób, planuje urlop z partnerem", P02: "Ojciec prowadzący działalność, zadłużenie składkowe 1 200 zł", P03: "Zleceniobiorczyni bez dobrowolnego chorobowego",
  P04: "Pracownica, bliźnięta, łączy pracę z urlopem rodzicielskim", P05: "Pracownica, wcześniak, pobyt w szpitalu", P06: "Pracownica, dziecko urodzone martwe", P07a: "Adopcja – Agnieszka (rodzic 1)",
  P07b: "Adopcja – Piotr (rodzic 2)", P08: "Pracownica, zmiana pracy w ciąży", P09: "Ciąża zagrożona, zmienne wynagrodzenie, zwolnienia e-ZLA", P10: "Ojciec po śmierci matki dziecka",
};
