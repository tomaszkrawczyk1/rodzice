// Treści statyczne aplikacji. Liczby i terminy z przepisów są w parametry.json (panel admina) – tu tylko opisy.
export const DRUKI = [
  { kod: "ZAM", nazwa: "Wniosek o zasiłek macierzyński", opis: "Od 24.10.2026 jeden druk zastępuje ZAM, ZUR i ZAO (macierzyński, rodzicielski, ojcowski). Zawiera m.in. pole wyboru wariantu 81,5%.", kto: "Każdy ubezpieczony; składa pracodawcy (pracownik, płatnik >20 os.) albo do ZUS" },
  { kod: "Z-3", nazwa: "Zaświadczenie płatnika składek (pracownik)", opis: "Płatnik zatrudniający do 20 osób przekazuje do ZUS dane o wynagrodzeniu i okresach urlopu, na których ZUS ustala zasiłek.", kto: "Pracodawca (do ZUS)" },
  { kod: "Z-3a", nazwa: "Zaświadczenie płatnika składek (inni ubezpieczeni)", opis: "Dla ubezpieczonych niebędących pracownikami (np. zleceniobiorca), gdy zasiłek ustala ZUS.", kto: "Płatnik składek (do ZUS)" },
  { kod: "e-ZLA", nazwa: "Elektroniczne zwolnienie lekarskie", opis: "Wystawia lekarz; trafia automatycznie do ZUS i na profil pracodawcy. W ciąży oznaczone kodem literowym „B”.", kto: "Lekarz" },
  { kod: "ZUA", nazwa: "Zgłoszenie do ubezpieczeń (dobrowolne chorobowe)", opis: "Dobrowolne ubezpieczenie chorobowe nie działa wstecz – obejmuje od dnia zgłoszenia.", kto: "Zleceniobiorca / przedsiębiorca (do ZUS)" },
  { kod: "Odpis aktu", nazwa: "Odpis skrócony aktu urodzenia", opis: "ZUS zwykle pozyskuje go sam z rejestru stanu cywilnego; w razie potrzeby złóż wniosek w urzędzie stanu cywilnego (symulacja w zakładce Odpis).", kto: "Urząd stanu cywilnego" },
  { kod: "Wniosek o urlop", nazwa: "Wniosek do pracodawcy o urlop macierzyński / rodzicielski / ojcowski", opis: "Pracownik składa pracodawcy w terminach z Kodeksu pracy (np. urlop rodzicielski – min. 21 dni przed rozpoczęciem).", kto: "Pracownik (do pracodawcy)" },
];

export const RYZYKA = [
  { t: "Brak ubezpieczenia chorobowego w dniu porodu", d: "Zasiłek macierzyński przysługuje tylko, gdy w dniu porodu trwa ubezpieczenie chorobowe. Zakończona umowa, koniec zlecenia albo niezgłoszenie do dobrowolnego chorobowego oznaczają brak zasiłku (wyjątki: upadłość/likwidacja pracodawcy, wyrok sądu).", sev: "danger" },
  { t: "Umowa lub firma „na pokaz”", d: "Umowa o pracę albo działalność założona wyłącznie po to, by uzyskać zasiłki, nie rodzi skutków w ubezpieczeniach. ZUS może wydać decyzję o niepodleganiu ubezpieczeniom, a wtedy zasiłku nie będzie.", sev: "danger" },
  { t: "Sztuczne podwyższenie podstawy w ciąży", d: "Nagłe podniesienie składek wyłącznie dla wyższego zasiłku może zostać zakwestionowane – ZUS ustali wtedy niższą podstawę, a więc niższe świadczenia.", sev: "danger" },
  { t: "Zadłużenie składkowe (działalność gospodarcza)", d: "Gdy w dniu powstania prawa zadłużenie przekracza 1% minimalnego wynagrodzenia, wypłata jest wstrzymana do spłaty całości długu. Prawo przedawnia się, jeśli nie spłacisz długu w ciągu 6 miesięcy.", sev: "danger" },
  { t: "Brak wniosku o wariant 81,5% w terminie", d: "Wniosek o uśrednienie zasiłku (81,5% przez cały okres) składa się najpóźniej 21 dni po porodzie. Po terminie obowiązuje wariant standardowy (100% / 70%).", sev: "warn" },
  { t: "Drugi rodzic nie wykorzysta swoich 9 tygodni", d: "9 tygodni urlopu rodzicielskiego jest wyłączne dla każdego rodzica i nie można go przenieść – niewykorzystane przepada, a zasiłek za tę część to zawsze 70%.", sev: "warn" },
  { t: "Łączenie pracy z urlopem rodzicielskim", d: "Praca możliwa do ½ etatu i tylko u pracodawcy, który udziela urlopu. Zasiłek zmniejsza się proporcjonalnie do wymiaru pracy; pracodawca może odmówić z przyczyn organizacyjnych (poinformuje w 7 dni).", sev: "warn" },
  { t: "Zmiana pracy lub przerwa w ubezpieczeniu", d: "Przerwa do 30 dni nie przerywa ciągłości ubezpieczenia. Dłuższa przerwa oznacza, że okres wyczekiwania (30 dni – obowiązkowe, 90 dni – dobrowolne chorobowe) liczy się od nowa.", sev: "warn" },
  { t: "Spóźniony wniosek", d: "Prawo do zasiłku przedawnia się po 6 miesiącach od wymagalności – nie zwlekaj z wnioskiem do pracodawcy lub ZUS.", sev: "warn" },
  { t: "Wyrejestrowanie z dobrowolnego chorobowego", d: "Osoby ubezpieczone dobrowolnie są wyrejestrowywane z ubezpieczenia chorobowego po rozpoczęciu pobierania zasiłku – to normalne, ale warto o tym wiedzieć przy planowaniu kolejnych świadczeń.", sev: "info" },
];

export const OCHRONA = [
  "Od początku ciąży do końca urlopu pracodawca nie może wypowiedzieć ani rozwiązać umowy o pracę (Kodeks pracy, art. 177).",
  "Ochrona obowiązuje też od dnia złożenia wniosku o urlop macierzyński, rodzicielski, ojcowski lub uzupełniający do dnia jego zakończenia – także ojca.",
  "Wyjątek: rozwiązanie z winy pracownicy (tzw. dyscyplinarne) za zgodą zakładowej organizacji związkowej oraz ogłoszenie upadłości lub likwidacja pracodawcy.",
  "Umowa na czas określony lub na okres próbny dłuższy niż 1 miesiąc, która skończyłaby się po upływie 3. miesiąca ciąży, jest przedłużana do dnia porodu.",
  "Ochrona dotyczy pracowników. Osoby na zleceniu lub prowadzące działalność nie są objęte przepisami Kodeksu pracy o ochronie stosunku pracy.",
];

export const TRUDNE = [
  { id: "martwe", t: "Dziecko urodziło się martwe", d: ["Przysługuje zasiłek macierzyński za 8 tygodni po porodzie (100% podstawy).", "Wniosek składasz tak samo jak przy porodzie; potrzebny jest odpis skrócony aktu zgonu/akt urodzenia z adnotacją albo zaświadczenie o martwym urodzeniu.", "Poza zasiłkiem może przysługiwać zasiłek pogrzebowy – sprawdź w ZUS (wniosek w ciągu 12 miesięcy od pochówku)."] },
  { id: "zgon", t: "Dziecko zmarło po urodzeniu", d: ["Gdy zgon nastąpi przed ukończeniem 8 tygodni życia: zasiłek za 8 tygodni po porodzie, nie krócej niż 7 dni od dnia zgonu.", "Gdy zgon nastąpi później: prawo do zasiłku zachowujesz przez 7 dni od dnia zgonu.", "Przy ciąży mnogiej wymiar liczy się stosownie do liczby dzieci pozostałych przy życiu."] },
  { id: "wczesniak", t: "Dziecko urodziło się przedwcześnie lub choruje", d: ["Przysługuje uzupełniający urlop macierzyński: tydzień za każdy tydzień pobytu dziecka w szpitalu (do 8 lub 15 tygodni po porodzie – zależnie od tygodnia ciąży i wagi).", "Wniosek składasz najpóźniej 21 dni przed końcem urlopu macierzyńskiego, z zaświadczeniem ze szpitala.", "Przy dziecku z zaświadczeniem „Za życiem” urlop rodzicielski jest dłuższy (65 lub 67 tygodni)."] },
  { id: "matka", t: "Śmierć, ciężka choroba lub porzucenie dziecka przez matkę", d: ["Ojciec dziecka może przejąć pozostałą część urlopu macierzyńskiego już przed upływem 14 tygodni.", "Dotyczy też sytuacji, gdy matka przebywa w szpitalu i nie może opiekować się dzieckiem albo ma orzeczoną niezdolność do samodzielnej egzystencji.", "Potrzebne dokumenty: akt zgonu albo zaświadczenie szpitala, odpis skrócony aktu urodzenia dziecka."] },
  { id: "ciaza", t: "Zagrożona ciąża lub poronienie", d: ["Zwolnienie lekarskie w ciąży (kod „B”) daje zasiłek chorobowy w wysokości 100% podstawy, nawet do 270 dni.", "Po poronieniu skorzystaj z pomocy lekarza i psychologa – masz prawo do zwolnienia lekarskiego.", "O szczegółach świadczeń w Twojej sytuacji zapytaj ZUS przez PUE (zakładka PUE)."] },
];

export const WSPARCIE = [
  { nazwa: "Fundacja Gajusz", opis: "Hospicjum domowe i opieka paliatywna nad ciężko chorymi dziećmi, wsparcie rodzin także w żałobie.", dla: ["zgon", "wczesniak", "ciaza"] },
  { nazwa: "Fundacja Dzieciom „Zdążyć z Pomocą”", opis: "Pomoc w leczeniu i rehabilitacji ciężko chorych dzieci (zbiórki, wsparcie rodzin).", dla: ["wczesniak", "ciaza"] },
  { nazwa: "Fundacja Rodzin Adopcyjnych", opis: "Wsparcie, szkolenia i poradnictwo dla rodzin adopcyjnych i zastępczych.", dla: ["adopcja"] },
  { nazwa: "Stowarzyszenie „Dla Dobra Wcześniaków” / organizacje rodziców wcześniaków", opis: "Grupy wsparcia i informacje dla rodziców dzieci urodzonych przedwcześnie – sprawdź lokalne stowarzyszenia przy szpitalu neonatologicznym.", dla: ["wczesniak"] },
  { nazwa: "Telefon zaufania i poradnie psychologiczne dla osób po stracie", opis: "Całodobowa linia wsparcia w kryzysie: 116 123 (dla dorosłych) oraz bezpłatna pomoc psychologiczna w poradniach i szpitalach.", dla: ["martwe", "zgon", "ciaza", "matka"] },
];
export const WSPARCIE_UWAGA = "Lista ma charakter informacyjny i obejmuje wyłącznie organizacje charytatywne. Przed kontaktem sprawdź aktualne dane na oficjalnych stronach organizacji – nazwy i zakres działania mogą się zmieniać.";

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
