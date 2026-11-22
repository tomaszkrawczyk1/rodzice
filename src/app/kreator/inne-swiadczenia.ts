// Świadczenia spoza ZUS-owskich zasiłków, o których warto przypomnieć po narodzinach dziecka.
// Nie ma ich (jeszcze) w faq.json – dlatego trzymamy je tu, krótko, z prośbą o potwierdzenie w urzędzie.
export type InneSwiadczenie = { id: string; nazwa: string; ile: string; komu: string; gdzie: string; termin: string };

export const INNE_SWIADCZENIA: Record<string, InneSwiadczenie> = {
  "800plus": {
    id: "800plus",
    nazwa: "800+ (świadczenie wychowawcze)",
    ile: "800 zł miesięcznie na każde dziecko, do 18. urodzin.",
    komu: "Każdemu rodzicowi, bez względu na dochód i na to, czy pracuje.",
    gdzie: "Wniosek składasz do ZUS przez internet: na PUE/eZUS, w aplikacji mZUS albo w bankowości internetowej.",
    termin: "Złóż go w ciągu 3 miesięcy od urodzenia dziecka – wtedy dostaniesz pieniądze od miesiąca urodzenia.",
  },
  becikowe: {
    id: "becikowe",
    nazwa: "Becikowe (jednorazowa zapomoga z tytułu urodzenia dziecka)",
    ile: "1000 zł jednorazowo.",
    komu: "Gdy dochód w rodzinie jest niski (próg sprawdzisz w urzędzie). Potrzebne jest zaświadczenie, że mama była pod opieką lekarza lub położnej najpóźniej od 10. tygodnia ciąży.",
    gdzie: "Wniosek składasz w urzędzie gminy lub miasta (często w ośrodku pomocy społecznej).",
    termin: "Masz na to 12 miesięcy od urodzenia dziecka.",
  },
};
