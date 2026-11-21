"""Generuje prezentację (10 slajdów) do zgłoszenia. python3 -I scripts/generuj_prezentacje.py docs/prezentacja.pptx"""
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

GREEN, NAVY, GREY = RGBColor(0x00, 0x99, 0x3F), RGBColor(0x00, 0x41, 0x6E), RGBColor(0x5D, 0x6B, 0x79)
prs = Presentation(); prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
blank = prs.slide_layouts[6]

def tb(s, x, y, w, h, text, size=20, bold=False, color=NAVY, align=None):
    t = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)).text_frame; t.word_wrap = True
    lines = text if isinstance(text, list) else [text]
    for i, l in enumerate(lines):
        p = t.paragraphs[0] if i == 0 else t.add_paragraph(); p.text = l; p.font.size = Pt(size); p.font.bold = bold; p.font.color.rgb = color; p.space_after = Pt(8)
        if align: p.alignment = align
    return t

def slide(title, bullets=None, img=None, note=None):
    s = prs.slides.add_slide(blank)
    bar = s.shapes.add_shape(1, 0, 0, prs.slide_width, Inches(0.25)); bar.fill.solid(); bar.fill.fore_color.rgb = GREEN; bar.line.fill.background()
    tb(s, 0.6, 0.5, 12, 1, title, 34, True)
    if bullets: tb(s, 0.7, 1.7, 6.3 if img else 12, 5, ["• " + b for b in bullets], 20, False, RGBColor(0x1B, 0x27, 0x33))
    if img:
        pic = s.shapes.add_picture(img, Inches(7.3), Inches(1.5), height=Inches(5.6))
        if pic.width > Inches(5.7): pic.width, pic.height = Inches(5.7), int(pic.height * Inches(5.7) / pic.width)
    if note: tb(s, 0.7, 6.9, 12, 0.5, note, 12, False, GREY)
    return s

s = prs.slides.add_slide(blank)
bg = s.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height); bg.fill.solid(); bg.fill.fore_color.rgb = NAVY; bg.line.fill.background()
tb(s, 0.8, 2.3, 11.5, 1.5, "Przewodnik Przyszłego Rodzica", 54, True, RGBColor(255, 255, 255))
tb(s, 0.8, 3.7, 11.5, 1, "Zasiłkowy przewodnik po świadczeniach – zadanie ZUS, HackNation 2026", 24, False, RGBColor(0xCF, 0xE0, 0xEE))
tb(s, 0.8, 5.6, 11.5, 0.6, "https://zxcvbnms.dev  ·  github.com/tomaszkrawczyk1/rodzice", 18, False, RGBColor(0x7F, 0xD9, 0xA3))

slide("Problem", ["Rodzice nie wiedzą, jakie uprawnienia im przysługują i w jakiej wysokości.", "Zdarzają się zaskoczenia brakiem zasiłku i rezygnacja z elastycznych rozwiązań z obawy przed utratą świadczeń.",
      "Skomplikowane procedury i dokumenty, szczególnie w sytuacjach nietypowych (wcześniak, adopcja, strata dziecka).", "ZUS dowiaduje się o dziecku dopiero po porodzie – brak wczesnej weryfikacji."])
slide("Rozwiązanie", ["Przewodnik krok po kroku: co przysługuje, ile, na jak długo, gdzie złożyć dokumenty.", "Jeden zintegrowany kalkulator dla matki, ojca i obojga rodziców.", "Oś czasu urlopów, porównanie wariantów 100/70% i 81,5%.",
      "Ostrzeżenia o ryzykach i delikatna ścieżka dla trudnych sytuacji.", "Symulacja: mObywatel, ZUS, e-ZLA, PUE, odpis aktu, wnioski."], "docs/screenshots/kalkulator.jpg")
slide("Funkcje (wymagania a–j)", ["W ciąży: zasiłek chorobowy, rehabilitacyjny, w wysokości macierzyńskiego – także „brak uprawnień”.", "Kalkulator: 5 trybów (matka, oboje, łączenie z pracą, adopcja/RZ, własne dane).",
      "Dokumenty i terminy: pracodawca >20 os. czy ZUS, druki ZAM / Z-3 / Z-3a.", "Ryzyka, ochrona przed zwolnieniem, trudne sytuacje i organizacje wsparcia.", "Kreator wniosków o urlop i zasiłek."])
slide("Silnik obliczeń – bez AI", ["Deterministyczny kod TypeScript, zero zależności, 76 testów jednostkowych.", "Oczekiwane liczby w testach policzone niezależnie od silnika.", "Każdy wynik pokazuje kroki obliczeń i podstawę prawną.",
      "Obsługa: wymiary 20/31/33/35/37 i 41/43/65/67 tyg., 9 tyg. nieprzenoszalnych, łączenie z pracą, uzupełniający urlop, martwe urodzenie, adopcja.", "Wszystkie liczby z przepisów w jednym pliku parametrów."])
slide("AI tam, gdzie ma sens: parser wniosków", ["Skany ZAM / Z-3 / Z-3a (średnio 23 strony, bez warstwy tekstu).", "1) puste strony odrzucane lokalnie, 2) AI klasyfikuje strony, 3) AI odczytuje pola do schematu JSON.",
      "4) Kod waliduje (PESEL, daty, 12 miesięcy) i LICZY podstawę. Model nigdy nie liczy kwot.", "Model: DeepSeek V4.1 Flash (DeepInfra), ok. 9 tys. tokenów na sprawę.", "Użytkownik potwierdza odczyt."], "docs/screenshots/wgraj-wniosek-ai.jpg")
slide("Panel administratora", ["Stawki, wymiary urlopów, limity i terminy zmieniane bez programisty.", "Kalkulator czyta parametry przy każdym obliczeniu – zmiana przepisów = zmiana pliku.", "Walidacja struktury i kopia zapasowa przy zapisie.", "Brak liczb z przepisów zaszytych w kodzie."])
slide("Architektura i bezpieczeństwo", ["Next.js 16 + TypeScript, REST API, w pełni responsywny interfejs.", "Wdrożenie: serwer z Caddy (HTTPS), usługi systemd, domena zxcvbnms.dev.",
      "Proxy LLM z twardym limitem: 100 zapytań i 1 mln tokenów, limit na IP, allowlista modelu.", "Prawdziwy klucz DeepInfra tylko na serwerze; w repozytorium wyłącznie publiczny token proxy.", "Dokumenty ZUS poza repozytorium; dane demo syntetyczne."])
slide("Potencjał wdrożeniowy", ["Gotowa warstwa REST dla integracji z systemami ZUS (zamiast symulacji).", "Parametry w pliku/bazie – szybka reakcja na zmiany przepisów.", "Parser skanów wspiera obsługę dokumentów papierowych i przykładowych spraw.",
      "Rozszerzenia: waloryzacja rehabilitacji, art. 48a/49, wyrównanie do 100%, powiadomienia o terminach."])
slide("Dziękujemy", ["Demo: https://zxcvbnms.dev", "Kod: https://github.com/tomaszkrawczyk1/rodzice", "Silnik bez AI, AI tylko do odczytu skanów, każdy wynik z krokami."])
prs.save(sys.argv[1]); print("zapisano", sys.argv[1], len(prs.slides.__iter__.__self__._sldIdLst), "slajdów")
