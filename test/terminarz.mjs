// Uruchom: node test/terminarz.mjs   (Node 18+, bez zależności). Kopia test.js z modułu Terminarz, ścieżki dopasowane do repo.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { buildCalendar, toICS, getPath } from '../src/lib/terminarz/terminarz.js';

const rules = JSON.parse(readFileSync(new URL('../src/lib/terminarz/rules.json', import.meta.url), 'utf8'));
const byId = (events, id) => events.find((e) => e.id === id);

// 1. Mama, umowa o pracę, poród 15.01.2027
const mama = buildCalendar(rules, { birthDate: '2027-01-15', role: 'mama', employment: 'umowa', children: 1 });
assert.equal(byId(mama, 'porod').date, '2027-01-15');
assert.equal(byId(mama, 'usc').date, '2027-02-05');            // +21 dni
assert.equal(byId(mama, 'zcna').date, '2027-01-22');           // +7 dni
assert.equal(byId(mama, 'plus800').date, '2027-04-15');        // +3 miesiące
assert.equal(byId(mama, 'becikowe').date, '2028-01-15');       // +12 miesięcy
assert.equal(byId(mama, 'plus800-nowy').date, '2027-02-01');   // najbliższy 1 lutego po porodzie
assert.equal(byId(mama, 'pit').date, '2028-04-30');            // rok po roku urodzenia
assert.equal(byId(mama, 'dobry-start').date, '2033-07-01');    // rok urodzenia + 6
assert.equal(byId(mama, 'kdr'), undefined);                    // tylko przy 3+ dzieciach
assert.equal(byId(mama, 'ojcowski'), undefined);               // tylko dla taty
assert.equal(byId(mama, 'zam-inne'), undefined);               // tylko zlecenie i działalność
assert.ok(byId(mama, 'zam-umowa'));
assert.equal(byId(mama, 'rodz-wniosek').date, '2027-05-14');   // 140 dni macierzyńskiego minus 21 dni = poród + 119 dni
assert.match(byId(mama, 'rodz-wniosek').description, /4 czerwca 2027/); // znacznik {{birth+140d}} podmieniony
assert.ok(!byId(mama, 'rodz-wniosek').description.includes('{{'));
assert.equal(byId(mama, 'zam-815').date, '2027-02-05');        // +21 dni
assert.equal(byId(mama, 'macierz-start').date, '2026-12-04');  // 6 tygodni przed porodem
assert.equal(byId(mama, 'macierz-koniec').date, '2027-06-03'); // 140. dzień urlopu
assert.equal(byId(mama, 'rodz-koniec').date, '2028-03-16');    // 20 + 41 tygodni
assert.equal(byId(mama, 'babciowe'), undefined);               // RKO zniesiony, zastąpił go Aktywny rodzic
assert.ok(byId(mama, 'aktywni-rodzice'));
assert.equal(byId(mama, 'aktywni-rodzice').date, '2028-01-15');
assert.deepEqual(mama.map((e) => e.date), [...mama.map((e) => e.date)].sort()); // sortowanie po dacie

// 2. Tata, działalność, 3 dzieci
const tata = buildCalendar(rules, { birthDate: '2027-01-15', role: 'tata', employment: 'jdg', children: 3 });
assert.equal(byId(tata, 'ojcowski').date, '2028-01-14');       // 12 miesięcy minus 1 dzień (parametry.json)
assert.ok(byId(tata, 'kdr'));
assert.ok(byId(tata, 'zam-rodz'));
assert.equal(byId(tata, 'chorobowe90'), undefined);            // dotyczy mamy
assert.equal(byId(tata, 'tata-macierzynski').date, '2027-04-09'); // 14 tygodni po porodzie minus 14 dni na wniosek
assert.equal(byId(tata, 'zam-umowa'), undefined);
assert.match(byId(tata, 'zcna').description, /samodzielnie|sam jako płatnik/);

// 3. Bez zatrudnienia: świadczenie rodzicielskie, bez ZCNA i zasiłku macierzyńskiego
const brak = buildCalendar(rules, { birthDate: '2027-01-15', role: 'mama', employment: 'brak' });
assert.ok(byId(brak, 'swiadczenie-rodz'));
assert.equal(byId(brak, 'zcna'), undefined);
assert.equal(byId(brak, 'zam-umowa'), undefined);

// 4. Rok przestępny: 29.02.2028 + 12 miesięcy = 28.02.2029
const leap = buildCalendar(rules, { birthDate: '2028-02-29', role: 'mama', employment: 'umowa' });
assert.equal(byId(leap, 'becikowe').date, '2029-02-28');

// 5. Poród po 1 lutego: kolejny nabór 800+ dopiero w następnym roku
const late = buildCalendar(rules, { birthDate: '2027-03-10', role: 'mama', employment: 'umowa' });
assert.equal(byId(late, 'plus800-nowy').date, '2028-02-01');

// 6. Błędne dane wejściowe
assert.throws(() => buildCalendar(rules, { birthDate: '2027-02-30', role: 'mama', employment: 'umowa' }), /poprawną datą/);
assert.throws(() => buildCalendar(rules, { birthDate: '2027-01-15', role: 'dziadek', employment: 'umowa' }), /role/);
assert.throws(() => buildCalendar(rules, { birthDate: '2027-01-15', role: 'mama', employment: 'inne' }), /employment/);

// 7. Każda reguła ma komplet pól
for (const r of rules.rules) {
  for (const k of ['id', 'who', 'employment', 'kind', 'when', 'title', 'category']) assert.ok(r[k] !== undefined, r.id + ': brak ' + k);
  assert.ok(r.body || r.bodyByEmployment, r.id + ': brak body');
  if (r.bodyByEmployment) for (const e of r.employment) assert.ok(r.bodyByEmployment[e], r.id + ': brak opisu dla ' + e);
}
assert.equal(new Set(rules.rules.map((r) => r.id)).size, rules.rules.length, 'identyfikatory reguł muszą być unikalne');

// 7a. Liczby z parametry.json: każdy {param, fallback} w regułach zgadza się z parametry.json, a daty są takie same
const paramsUrl = new URL('../data/parametry.json', import.meta.url);
if (existsSync(paramsUrl)) {
  const params = JSON.parse(readFileSync(paramsUrl, 'utf8'));
  const terms = [];
  const collect = (x) => {
    if (Array.isArray(x)) x.forEach(collect);
    else if (x && typeof x === 'object' && x.param) terms.push(x);
  };
  for (const r of rules.rules) for (const k of ['years', 'months', 'days']) if (r.when) collect(r.when[k]);
  assert.ok(terms.length >= 8, 'oczekiwano reguł zasilanych z parametry.json');
  for (const t of terms) assert.equal(getPath(params, t.param), t.fallback, 'fallback różni się od parametry.json: ' + t.param);
  const input = { birthDate: '2027-01-15', role: 'mama', employment: 'umowa' };
  const a = buildCalendar(rules, input).map((e) => e.id + e.date);
  const b = buildCalendar(rules, input, { params }).map((e) => e.id + e.date);
  assert.deepEqual(a, b);
  // zmiana parametru przesuwa datę (panel admina)
  const p2 = JSON.parse(JSON.stringify(params));
  p2.terminy_dni.wniosek_pelny_wymiar_81_5_po_porodzie = 30;
  assert.equal(buildCalendar(rules, input, { params: p2 }).find((e) => e.id === 'zam-815').date, '2027-02-14');
} else {
  console.log('Pominięto test zgodności z parametry.json (brak pliku obok).');
}

// 7b. Linki
assert.ok(byId(mama, 'zam-umowa').links.some((l) => l.url.startsWith('https://www.zus.pl/')));
for (const r of rules.rules) for (const l of r.links || []) assert.match(l.url, /^https:\/\//, r.id + ': link musi być https');

// 8. ICS
const ics = toICS(mama, { now: new Date('2026-11-21T10:00:00Z') });
assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, mama.length);
assert.ok(ics.includes('DTSTART;VALUE=DATE:20270205'));
assert.ok(ics.split('\r\n').every((l) => l.length <= 75), 'linie ICS muszą mieć najwyżej 75 znaków');

console.log('OK: wszystkie testy przeszły. Mama/umowa: ' + mama.length + ' wydarzeń, tata/jdg: ' + tata.length + '.');
