import type { Jezyk } from "@/i18n/jezyki";

/**
 * Wyszukiwarka spraw (`szukaj` w sprawy.ts) rozumie tylko polskie słowa. Dla angielskiego i ukraińskiego zamieniamy
 * rozpoznane słowa kluczowe na polskie odpowiedniki i przekazujemy do tej samej wyszukiwarki. Nic nie jest wysyłane
 * na serwer. Reguły działają na rdzeniach słów, więc łapią też odmienione formy („відпустки", „leaves").
 * Nierozpoznane słowa są pomijane: przy średniej ocen dopasowania obce słowa tylko zaniżałyby wynik.
 */
type Regula = [RegExp, string];

const PRZED = "(?<![\\p{L}'’])";
const rx = (zrodlo: string) => new RegExp(PRZED + zrodlo, "iu");
const KONIEC = "(?![\\p{L}])";

const EN: Regula[] = [
  [rx("(boss|employer|supervisor|manager|hr|human resources)" + KONIEC), "szef pracodawca"],
  [rx("(won['’]?t|will not|refus\\p{L}*|den(y|ies|ied)|declin\\p{L}*|reject\\p{L}*|doesn['’]?t want|does not want|not allow\\p{L}*|says no)"), "odmawia"],
  [rx("(leave|vacation|time off)"), "urlop"],
  [rx("maternity"), "macierzyński"],
  [rx("paternity"), "ojcowski"],
  [rx("parental"), "rodzicielski"],
  [rx("(husband|partner|spouse|dad|father|daddy)"), "mąż partner tata"],
  [rx("(adopt\\p{L}*|foster)"), "adopcja"],
  [rx("(after (the )?(birth|delivery|giving birth)|postpartum|after (the )?baby)"), "po porodzie"],
  [rx("(how much|get|receive|money|payout|paid)" + KONIEC), "dostanę pieniądze"],
  [rx("(benefit|allowance|payment|pay)" + KONIEC), "zasiłek"],
  [rx("(miscarriage|lost (the )?pregnancy)"), "poronienie"],
  [rx("(stillborn|stillbirth)"), "martwe"],
  [rx("(premature|preemie|born early)"), "wcześniak"],
  [rx("hospital"), "szpital"],
  [rx("(died|death|passed away)"), "zmarło"],
  [rx("(birth certificate|certificate of birth)"), "odpis aktu urodzenia"],
  [rx("(deadline|time limit|too late|late filing|statute of limitations)"), "termin"],
  [rx("(waiting period|qualifying period)"), "wyczekiwania"],
  [rx("(debt|arrears|unpaid contributions)"), "zadłużenie"],
  [rx("(sick (leave|note)|l4|e-?zla|doctor['’]?s note|sickness)"), "zwolnienie"],
  [rx("pregnan\\p{L}*"), "ciąża"],
  [rx("(work|working|job|part[- ]time)" + KONIEC), "praca"],
  [rx("(split|share|divide)"), "podzielić"],
  [rx("(application|apply|form)" + KONIEC), "wniosek"],
  [rx("insurance"), "ubezpieczenie"],
  [rx("(self[- ]employed|own business|sole trader)"), "działalność"],
];

const UK: Regula[] = [
  [rx("(бос" + KONIEC + "|боса|босу|начальник|керівник|роботодав|шеф)"), "szef pracodawca"],
  [rx("(відмов|не хоче дати|не дає|не дозволя|не відпускає)"), "odmawia"],
  [rx("відпустк"), "urlop"],
  [rx("(декрет|материнств|материнськ)"), "macierzyński urlop"],
  [rx("(по догляду|батьківськ)"), "rodzicielski"],
  [rx("(чолов|партнер|тато|тата|татом|батьк|батько)"), "mąż partner tata"],
  [rx("(усинов|удочер|прийомн)"), "adopcja"],
  [rx("(після пологів|пологів|після народження|народжен)"), "po porodzie"],
  [rx("(скільки (я )?(отрим|дост)|гроші|грошей|виплат)"), "dostanę pieniądze"],
  [rx("(допомог|виплата)"), "zasiłek"],
  [rx("(викидень|викидн|втрат\\p{L}* вагітн)"), "poronienie"],
  [rx("(мертвонародж|мертв)"), "martwe"],
  [rx("(недоношен|передчасн)"), "wcześniak"],
  [rx("(лікарн(я|і|ю)" + KONIEC + "|шпитал)"), "szpital"],
  [rx("(помер|смерть|загинув)"), "zmarło"],
  [rx("(свідоцтв\\p{L}* (про )?народж|витяг з акт)"), "odpis aktu urodzenia"],
  [rx("(термін|дедлайн|прострочен|пізно)"), "termin"],
  [rx("(період очікування|очікуван)"), "wyczekiwania"],
  [rx("(заборгован|борг)"), "zadłużenie"],
  [rx("(лікарнян|больнични|l4)"), "zwolnienie"],
  [rx("вагітн"), "ciąża"],
  [rx("(працюв|робот|підробіт)"), "praca"],
  [rx("(поділ|розділ)"), "podzielić"],
  [rx("(заяв|подати|форм)"), "wniosek"],
  [rx("страхуван"), "ubezpieczenie"],
  [rx("(фоп|підприєм|власна справа)"), "działalność"],
];

/** Polskie słowa kluczowe dla zapytania w EN/UK. Gdy niczego nie rozpoznano, zwraca zapytanie bez zmian. */
export function naPolskieZapytanie(q: string, jezyk: Jezyk): string {
  if (jezyk === "pl") return q;
  const reguly = jezyk === "uk" ? UK : EN;
  const tekst = q.toLowerCase();
  const slowa: string[] = [];
  for (const [re, pl] of reguly) if (re.test(tekst)) slowa.push(pl);
  return slowa.length ? [...new Set(slowa.join(" ").split(" "))].join(" ") : q;
}
