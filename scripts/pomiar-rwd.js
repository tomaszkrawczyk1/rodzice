// Pomiar responsywności. Wklej do konsoli (lub do evaluate) strony z tej samej domeny co aplikacja
// (np. http://localhost:3303/o-projekcie), potem:
//   const wyn = await mierzRwd([320, 360, 390, 412, 768, 1024]);  console.table(wyn.podsumowanie);
// Każda trasa ładuje się w iframe o zadanej szerokości (media queries reagują na szerokość iframe).
// Do szerokości dodajemy 15 px na pasek przewijania iframe, więc viewport = dokładnie W.
// Mierzone: scrollWidth dokumentu vs clientWidth, elementy wystające poza viewport (poza ukrytymi),
// cele dotykowe < 44 px, pola o czcionce < 16 px (zoom iOS).
const TRASY = ['/', '/sprawy', '/sprawa/co-przysluguje', '/sprawa/wniosek-zasilek',
  '/kalkulator?tryb=matka', '/kalkulator?tryb=oboje', '/kalkulator?tryb=laczenie', '/kalkulator?tryb=adopcja',
  '/kalkulator?tryb=wlasne', '/kalkulator?tryb=ojciec', '/kalendarz', '/poradnik', '/formularze', '/dokumenty',
  '/ciaza', '/pue', '/wnioski', '/odpis', '/druki', '/ryzyka', '/trudne', '/wgraj', '/logowanie', '/admin',
  '/kreator', '/o-projekcie'];

async function mierzRwd(szerokosci, trasy = TRASY) {
  const wynik = {};
  for (const W of szerokosci) {
    document.body.innerHTML = '';
    const ramki = trasy.map((r) => {
      const f = document.createElement('iframe');
      f.style.cssText = `width:${W + 15}px;height:800px;border:0;position:absolute;left:0;top:0;visibility:hidden`;
      f.src = r; document.body.appendChild(f); return f;
    });
    await new Promise((res) => setTimeout(res, 3500));
    const wiersze = [];
    for (const f of ramki) {
      const d = f.contentDocument, w = f.contentWindow;
      if (/kalkulator/.test(f.src) && !/ojciec/.test(f.src)) for (let i = 0; i < 20 && !d.querySelector('table.tbl'); i++) await new Promise((r) => setTimeout(r, 250));
      const de = d.documentElement, VW = de.clientWidth;
      const widoczny = (e) => { const r = e.getBoundingClientRect(), cs = w.getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const pomin = (e) => e.closest('.sr-only,.vh,.skip,thead');
      const wystaje = [];
      d.querySelectorAll('body *').forEach((e) => {
        if (!widoczny(e) || pomin(e) || /^(SCRIPT|STYLE)$/.test(e.tagName)) return;
        // element w przewijanym kontenerze (overflow auto/scroll na przodku) nie rozpycha strony
        for (let p = e.parentElement; p && p !== d.body; p = p.parentElement) { const ox = w.getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return; }
        const r = e.getBoundingClientRect();
        if (r.right > VW + 1 || r.left < -1) wystaje.push(e.tagName.toLowerCase() + '.' + String(e.className).trim().split(/\s+/).join('.') + ':' + Math.round(r.left) + '..' + Math.round(r.right));
      });
      const male = [];
      d.querySelectorAll('a,button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab]').forEach((e) => {
        if (!widoczny(e) || pomin(e)) return;
        const lb = e.closest('label');
        if (lb && e.matches('input[type=radio],input[type=checkbox]') && lb.getBoundingClientRect().height >= 43.5) return;
        if (e.matches('a') && e.closest('p, .lead, .small')) return;   // link w zdaniu: WCAG 2.5.8 wyłącza
        const r = e.getBoundingClientRect();
        if (r.height < 43.5) male.push(((e.textContent || e.getAttribute('aria-label') || e.type || '').trim().slice(0, 25)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      });
      const pola = [];
      d.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea').forEach((e) => {
        if (widoczny(e) && parseFloat(w.getComputedStyle(e).fontSize) < 16) pola.push(e.name || e.id || e.type);
      });
      wiersze.push({ trasa: f.src.replace(location.origin, ''), sw: de.scrollWidth, cw: VW, wystaje, male, pola, tabela: !!d.querySelector('table.tbl') });
    }
    wynik[W] = wiersze;
  }
  const podsumowanie = Object.entries(wynik).map(([W, w]) => ({
    szerokosc: +W,
    poziomePrzewijanie: w.filter((r) => r.sw > r.cw).map((r) => r.trasa + ' ' + r.sw + '/' + r.cw),
    wystajace: w.filter((r) => r.wystaje.length).map((r) => r.trasa + ' ' + r.wystaje.slice(0, 2).join(' ')),
    celeDotykowe_lt44: w.reduce((n, r) => n + r.male.length, 0),
    polaPoniżej16: w.reduce((n, r) => n + r.pola.length, 0),
  }));
  return { wynik, podsumowanie };
}
if (typeof window !== 'undefined') window.mierzRwd = mierzRwd;
