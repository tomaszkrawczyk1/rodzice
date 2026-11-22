// Terminarz rodzica: czysta logika bez zależności. Działa w Node 18+ i w przeglądarce (ES module).
// Reguły są w rules.json. Ten plik tylko je filtruje i przelicza na daty.

const MS_DAY = 86400000;

export const ROLES = ['mama', 'tata'];
export const EMPLOYMENT = ['umowa', 'zlecenie', 'jdg', 'brak'];

/** Data z formatu RRRR-MM-DD jako UTC o północy (bez przesunięć stref czasowych). */
function parseISO(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) throw new Error('birthDate musi mieć format RRRR-MM-DD, otrzymano: ' + s);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (toISO(d) !== s) throw new Error('birthDate nie jest poprawną datą: ' + s);
  return d;
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  return new Date(d.getTime() + n * MS_DAY);
}

/** Dodaje miesiące; 31 stycznia + 1 miesiąc daje 28 lub 29 lutego, nie marca. */
function addMonths(d, n) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay)));
}

/** Odczyt wartości z zagnieżdżonego obiektu po ścieżce "a.b.1" (np. z parametry.json). */
export function getPath(obj, path) {
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/**
 * Wartość liczbowa z rules.json: liczba, {param, multiply?, fallback?} albo tablica takich elementów (suma).
 * `param` to ścieżka w parametry.json przekazanym w options.params. Gdy parametru brak, używany jest `fallback`.
 */
function evalNumber(x, params) {
  if (x == null) return 0;
  if (Array.isArray(x)) return x.reduce((s, t) => s + evalNumber(t, params), 0);
  if (typeof x === 'number') return x;
  const fromParams = params ? getPath(params, x.param) : undefined;
  const v = typeof fromParams === 'number' ? fromParams : x.fallback;
  if (typeof v !== 'number') throw new Error('Brak parametru "' + x.param + '" i wartości fallback');
  return v * (x.multiply == null ? 1 : x.multiply);
}

/** Zamienia opis "when" z rules.json na datę. */
function resolveWhen(when, birth, params) {
  switch (when.type) {
    case 'offset': {
      const months = evalNumber(when.years, params) * 12 + evalNumber(when.months, params);
      return addDays(addMonths(birth, months), evalNumber(when.days, params));
    }
    case 'calendar':
      return new Date(Date.UTC(birth.getUTCFullYear() + (when.yearOffset || 0), when.month - 1, when.day));
    case 'nextAnnual': {
      const y = birth.getUTCFullYear();
      const first = new Date(Date.UTC(y, when.month - 1, when.day));
      return first > birth ? first : new Date(Date.UTC(y + 1, when.month - 1, when.day));
    }
    default:
      throw new Error('Nieznany typ "when": ' + when.type);
  }
}

const plFormat = (d) =>
  new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);

/** Podmienia znaczniki {{birth+118d}} w opisie na datę (domyślnie "15 maja 2027"). */
function fillTokens(text, birth, formatDate) {
  return text.replace(/\{\{birth([+-]\d+)d\}\}/g, (_, n) => formatDate(addDays(birth, Number(n))));
}

/**
 * Buduje listę wydarzeń dla jednej osoby.
 *
 * @param {object|Array} rules  Zawartość rules.json (obiekt z polem "rules" albo sama tablica reguł).
 * @param {{birthDate: string, role: 'mama'|'tata', employment: 'umowa'|'zlecenie'|'jdg'|'brak', children?: number}} input
 *        birthDate: planowana lub faktyczna data porodu (RRRR-MM-DD).
 *        children: liczba dzieci w rodzinie po porodzie (domyślnie 1); od 3 pojawia się Karta Dużej Rodziny.
 * @param {{formatDate?: (d: Date) => string, params?: object}} [options]  formatDate: własny format dat wstawianych do opisów.
 *        params: zawartość parametry.json (stawki, wymiary, terminy). Reguły z {param} biorą z niej liczby;
 *        bez niej używają wartości `fallback` zapisanych w rules.json.
 * @returns {Array<{id:string, date:string, daysFromBirth:number, kind:'deadline'|'recommended'|'info', title:string,
 *   description:string, who:string, institution:string|null, forms:string[], category:string, verify:boolean,
 *   isBirth:boolean, sources:string[]}>} posortowane rosnąco po dacie
 */
export function buildCalendar(rules, input, options = {}) {
  const list = Array.isArray(rules) ? rules : rules.rules;
  const { birthDate, role, employment } = input || {};
  const children = input && input.children != null ? input.children : 1;
  if (!ROLES.includes(role)) throw new Error('role musi być jedną z: ' + ROLES.join(', '));
  if (!EMPLOYMENT.includes(employment)) throw new Error('employment musi być jedną z: ' + EMPLOYMENT.join(', '));
  if (!Number.isInteger(children) || children < 1) throw new Error('children musi być liczbą całkowitą >= 1');
  const birth = parseISO(birthDate);
  const formatDate = options.formatDate || plFormat;

  return list
    .filter((r) => (r.who === 'all' || r.who === role) && r.employment.includes(employment) && (r.minChildren || 1) <= children)
    .map((r) => {
      const date = resolveWhen(r.when, birth, options.params);
      const raw = r.bodyByEmployment ? r.bodyByEmployment[employment] : r.body;
      return {
        id: r.id,
        date: toISO(date),
        daysFromBirth: Math.round((date - birth) / MS_DAY),
        kind: r.kind,
        title: r.title,
        description: fillTokens(raw, birth, formatDate),
        who: r.who,
        institution: r.institution || null,
        forms: r.forms || [],
        links: r.links || [],
        category: r.category,
        verify: !!r.verify,
        isBirth: !!r.isBirth,
        sources: r.sources || [],
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : Number(b.isBirth) - Number(a.isBirth) || a.id.localeCompare(b.id)));
}

// ---------- eksport do iCalendar (.ics) ----------

function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Linie iCalendar mają maksymalnie 75 znaków; dłuższe zawija się spacją na początku kolejnej.
function icsFold(line) {
  const parts = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

/**
 * Zamienia wynik buildCalendar na tekst pliku .ics (wydarzenia całodniowe).
 * Zwraca string; zapis i pobranie pliku zależą od aplikacji.
 */
export function toICS(events, options = {}) {
  const prodId = options.prodId || '-//Terminarz rodzica//PL';
  const stamp = (options.now || new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const labels = {
    where: 'Gdzie:',
    documents: 'Dokumenty:',
    verify: 'Zasada do weryfikacji w ZUS lub gminie.',
    ...(options.labels || {}),
  };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:' + prodId, 'CALSCALE:GREGORIAN'];
  for (const ev of events) {
    const start = ev.date.replace(/-/g, '');
    const end = toISO(addDays(parseISO(ev.date), 1)).replace(/-/g, '');
    const details = [ev.description];
    if (ev.institution) details.push(labels.where + ' ' + ev.institution);
    if (ev.forms.length) details.push(labels.documents + ' ' + ev.forms.join(', '));
    for (const l of ev.links || []) details.push(l.title + ': ' + l.url);
    if (ev.verify) details.push(labels.verify);
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + ev.id + '-' + start + '@terminarz',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + start,
      'DTEND;VALUE=DATE:' + end,
      'SUMMARY:' + icsEscape(ev.title),
      'DESCRIPTION:' + icsEscape(details.join('\n')),
      'CATEGORIES:' + icsEscape(ev.category),
      'TRANSP:TRANSPARENT'
    );
    if (ev.kind === 'deadline') lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(ev.title), 'TRIGGER:-P7D', 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
