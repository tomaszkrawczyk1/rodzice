"""Generuje SYNTETYCZNE dokumenty demo (fikcyjne dane) do testowania parsera. Uruchom: python3 -I scripts/generuj_demo.py <katalog_wyjscia>"""
import sys, glob
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]
fp = (glob.glob("/usr/share/fonts/**/DejaVuSans.ttf", recursive=True) or [None])[0]
fb = (glob.glob("/usr/share/fonts/**/DejaVuSans-Bold.ttf", recursive=True) or [fp])[0]
F = lambda s, b=False: ImageFont.truetype(fb if b else fp, s)
W, H = 1240, 1754

def strona():
    im = Image.new("RGB", (W, H), "white"); return im, ImageDraw.Draw(im)

def z3(osoba, pesel, kwota, plik):
    im, d = strona()
    d.rectangle([60, 50, W - 60, 130], outline="black", width=3)
    d.text((80, 62), "ZAŚWIADCZENIE PŁATNIKA SKŁADEK  Z-3", font=F(34, True), fill="black")
    d.text((80, 105), "DEMONSTRACYJNY DOKUMENT – dane fikcyjne, nie jest drukiem ZUS", font=F(18), fill="#a00")
    y = 170
    for k, v in [("Płatnik składek", "FIRMA TESTOWA SA, NIP 0000000001"), ("Liczba ubezpieczonych u płatnika", "powyżej 20"), ("Ubezpieczona", osoba), ("PESEL", pesel),
                 ("Zatrudniona od", "2023-03-01"), ("Wymiar czasu pracy", "pełny etat (1)"), ("Wniosek o zasiłek macierzyński za okres", "od 2027-03-15 do 2027-08-01")]:
        d.text((80, y), k + ":", font=F(22, True), fill="black"); d.text((520, y), v, font=F(22), fill="black"); y += 42
    y += 20; d.text((80, y), "Tabela 1. Składniki wynagrodzenia za okresy miesięczne", font=F(24, True), fill="black"); y += 50
    kol = ["Rok", "Miesiąc", "Dni przepracowane", "Dni obowiązany", "Składniki stałe", "Zmienne pomniejsz.", "Premie faktyczne", "% składki"]
    x = [80, 190, 330, 520, 700, 880, 1030, 1150]
    d.rectangle([70, y - 6, W - 70, y + 62], fill="#e8eef5")
    for i, k in enumerate(kol): d.text((x[i], y), k.replace(" ", "\n", 1) if len(k) > 11 else k, font=F(17, True), fill="black")
    y += 76
    for i in range(12):
        m = (3 + i - 1) % 12 + 1; r = 2026 + (3 + i - 1) // 12
        dni = [22, 20, 22, 22, 21, 22, 23, 20, 22, 23, 21, 21][i]
        vals = [str(r), str(m), str(dni), str(dni), f"{kwota:.2f}", "0.00", "0.00", "13.71"]
        for j, v in enumerate(vals): d.text((x[j], y), v, font=F(20), fill="black")
        d.line([70, y + 34, W - 70, y + 34], fill="#bbb"); y += 40
    d.text((80, y + 30), "Oświadczam, że dane zawarte w zaświadczeniu są zgodne z prawdą.", font=F(20), fill="black")
    d.text((80, y + 80), "Data: 2027-01-20        Podpis płatnika: ………………………", font=F(20), fill="black")
    im.save(f"{out}/{plik}", "PDF", resolution=150)

z3("Anna Kowalska", "00000000001", 6500.00, "Z-3_przyklad_Anna_Kowalska.pdf")
z3("Dominika Kamińska", "00000000008", 5800.00, "Z-3_przyklad_Dominika_Kaminska.pdf")

# ZAM – uproszczony
im, d = strona()
d.rectangle([60, 50, W - 60, 130], outline="black", width=3)
d.text((80, 62), "ZAM – Wniosek o zasiłek macierzyński", font=F(34, True), fill="black"); d.text((80, 105), "DEMONSTRACYJNY DOKUMENT – dane fikcyjne, nie jest drukiem ZUS", font=F(18), fill="#a00")
y = 170
for k, v in [("Imię i nazwisko", "Anna Kowalska"), ("PESEL", "00000000001"), ("Płatnik składek", "FIRMA TESTOWA SA, NIP 0000000001"), ("Wnioskuję w związku z", "☒ urodzeniem dziecka"),
             ("Data porodu", "2027-03-15"), ("Zasiłek za okres urlopu macierzyńskiego", "☒  od 2027-03-15  do 2027-08-01"), ("Zasiłek za okres urlopu rodzicielskiego", "☒  od 2027-08-02  do 2028-03-12"),
             ("Pełny wymiar (81,5%)", "☐ nie zamierzam"), ("Dziecko z zaświadczeniem „Za życiem”", "☐ nie")]:
    d.text((80, y), k + ":", font=F(22, True), fill="black"); d.text((620, y), v, font=F(22), fill="black"); y += 46
im.save(f"{out}/ZAM_przyklad_Anna_Kowalska.pdf", "PDF", resolution=150)
print("ok")
