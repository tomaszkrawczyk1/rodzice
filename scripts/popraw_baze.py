#!/usr/bin/env python3
"""Korekty bazy reguł (błędy A1–A5 i luka B1 z od_kolegi/LUKI_I_DECYZJE.md).
  python3 -I popraw_baze.py <baza_regul_dedup.json> <baza_regul_v2.json>
Każda zmiana trafia do pola `korekty` danego elementu i do raportu."""
import json, sys

Q_PORADNIK = {"dok": "poradnik ZUS", "przepis": "Podstawa wymiaru zasiłku – pracownik",
              "cytat": "Tak uzyskaną kwotę pomniejsza się o należne składki na ubezpieczenia społeczne (13,71%)"}
Q_REHAB1 = {"dok": "ustawa zasiłkowa", "przepis": "art. 19 ust. 1",
            "cytat": "Świadczenie rehabilitacyjne wynosi 90% podstawy wymiaru zasiłku chorobowego za okres pierwszych trzech mie-\nsięcy, 75% tej podstawy za pozostały okres, a jeżeli niezdolność do pracy przypada w okresie ciąży - 100% tej pod-\nstawy."}
Q_REHAB2 = {"dok": "ustawa zasiłkowa", "przepis": "art. 18 ust. 1-2",
            "cytat": "Świadczenie rehabilitacyjne przysługuje przez okres niezbędny do przywrócenia zdolności do pracy, niedłużej jed-\nnak niż przez 12 miesięcy."}
Q_9TYG = {"dok": "Kodeks pracy", "przepis": "art. 183 § 3",
          "cytat": "ma prawo do 9 tygodni urlopu na warunkach urlopu macierzyńskiego."}

log = []


def find(T, i):
    for t, d in T.items():
        for k in ("reguly", "formuly", "tabele"):
            for r in d.get(k, []):
                if r["id"] == i:
                    return t, r
    raise KeyError(i)


def note(r, kod, txt):
    r.setdefault("korekty", []).append({"kod": kod, "opis": txt})
    log.append((r["id"], kod, txt))


def main(src, dst):
    T = json.load(open(src))["tematy"]

    # A1 + A2: podstawa pracownika = średnia pomniejszona o 13,71%; stawki chorobowego/macierzyńskiego osobno
    _, f = find(T, "F-PODSTAWA-01")
    k = f["kroki"]
    i8 = next(i for i, s in enumerate(k) if s.startswith("8."))
    k.insert(i8 + 1, "8a. [KOREKTA] Pomniejsz otrzymaną średnią o 13,71% (składki na ubezpieczenia społeczne finansowane przez ubezpieczonego): "
                     "podstawa = średnia × (1 − 0,1371). Tę kwotę (po odliczeniu) stosuje się ZAWSZE, nie tylko przy minimalnym wynagrodzeniu. "
                     "Przykład: 6500 zł brutto → 5608,85 zł.")
    k[:] = [k[0]] + [s for s in k[1:]]
    for j, s in enumerate(k):
        if s.startswith("9. Jeżeli pracownik jest zatrudniony"):
            k[j] = ("9. Jeżeli pracownik jest zatrudniony w pełnym wymiarze i podlegają mu przepisy o minimalnym wynagrodzeniu — podstawa (już po odliczeniu 13,71%) "
                    "nie może być niższa niż minimalne wynagrodzenie pomniejszone o 13,71%.")
        if s.startswith("11. Kwota zasiłku"):
            k[j] = ("11. Kwota zasiłku za dany miesiąc = podstawa dzienna × liczba dni × stawka. Stawki zależą od rodzaju świadczenia: "
                    "zasiłek MACIERZYŃSKI 100% (okres urlopu macierzyńskiego), 70% (część urlopu rodzicielskiego), 81,5% (średnia przy wniosku o pełny wymiar); "
                    "zasiłek CHOROBOWY 80% (100% w okresie ciąży, art. 11 ust. 1) – NIE stosować 80% do zasiłku macierzyńskiego.")
    f["uzupelnienia"] = [u for u in f.get("uzupelnienia", []) if u.get("z") != "F-CIAZA-01"]
    f.setdefault("zrodla", []).append(Q_PORADNIK)
    note(f, "A1", "Dodano krok 8a: odjęcie 13,71% zawsze (wcześniej tylko przy minimum) – zgodnie z poradnikiem, silnik referencyjny i testem Anna 6500→5608,85.")
    note(f, "A2", "Rozdzielono stawki: macierzyński 100/70/81,5%, chorobowy 80%/100% w ciąży; usunięto uzupełnienie z F-CIAZA-01 mieszające 80% z macierzyńskim.")

    _, r = find(T, "R-PODSTAWA-01")
    r["to"] += "; od tak ustalonej średniej odejmuje się 13,71% (składki na ubezpieczenia społeczne) – podstawa wymiaru zasiłku jest kwotą po odliczeniu"
    r.setdefault("zrodla", []).append(Q_PORADNIK)
    note(r, "A1", "Dodano odjęcie 13,71% w skutku reguły.")

    # A3: 9 tygodni przy adopcji = minimum po obcięciu limitem wieku, nie dodatek ponad wymiar
    t = T["adopcja_rodzina_zastepcza"]
    t["podsumowanie"] = t["podsumowanie"].replace("z dodatkowymi 9 tygodniami w określonych przypadkach",
                                                 "przy czym urlop nie może trwać krócej niż 9 tygodni, gdy limit wieku dziecka skróciłby go poniżej tej wartości (art. 183 § 3 KP – do potwierdzenia u ZUS)")
    for d in t["dane_wejsciowe"]:
        if d["pole"] == "wiek_dziecka_w_dniu_przyjecia_lata":
            d["po_co"] = d["po_co"].replace("oraz prawo do 9 tygodni dodatkowego urlopu", "oraz minimum 9 tygodni urlopu na warunkach macierzyńskiego, gdy limit wieku skróciłby urlop")
    for r in t.get("reguly", []):
        if r["id"] == "R-ADOP-04":
            r["to"] = r["to"].replace("9 tygodni dodatkowego urlopu na warunkach urlopu macierzyńskiego", "uprawnienie do 9 tygodni urlopu na warunkach urlopu macierzyńskiego")
            r.setdefault("zrodla", []).append(Q_9TYG)
            note(r, "A3", "9 tygodni to minimum (nie dodatek ponad wymiar); interpretacja do potwierdzenia u mentora ZUS.")
    log.append(("adopcja_rodzina_zastepcza", "A3", "Podsumowanie i dane wejściowe: 9 tyg. = minimum po obcięciu limitem wieku, nie 'dodatkowe 9 tygodni'."))

    # A4: druki po 24.10.2026
    wn = T["wnioski_zasilki_dokumenty"]
    wn.setdefault("korekty_tematu", []).append({"kod": "A4", "opis":
        "Druki ZUR, ZAO i Z-3b zlikwidowane od 24.10.2026 (treść zadania). Poradnik ZUS 2026 jeszcze o nich wspomina – NIE stosować. "
        "Wniosek: ZAM; zaświadczenie płatnika: Z-3 (pracownik) / Z-3a (zlecenie). Przedsiębiorca (JDG) składa samo ZAM."})
    log.append(("wnioski_zasilki_dokumenty", "A4", "Dodano adnotację o likwidacji Z-3b/ZUR/ZAO i podziale ZAM/Z-3/Z-3a."))

    # A5: 21 dni = pole wyboru w ZAM
    wn["korekty_tematu"].append({"kod": "A5", "opis":
        "W nowym druku ZAM zamiar skorzystania z pełnego wymiaru (81,5%) to pole wyboru („co najmniej jeden dzień urlopu rodzicielskiego przypadać będzie w pierwszym roku życia dziecka”), "
        "a nie osobny wniosek. Kreator ma pokazać to pole oraz komunikat o terminie 21 dni po porodzie."})
    log.append(("wnioski_zasilki_dokumenty", "A5", "Dodano adnotację: 81,5% = pole wyboru w ZAM + komunikat o 21 dniach."))

    # B1: rehabilitacja
    T["ciaza"].setdefault("reguly", []).append({
        "id": "R-REHAB-01", "nazwa": "Świadczenie rehabilitacyjne – wysokość i czas",
        "dotyczy": "ubezpieczony, który wyczerpał zasiłek chorobowy i nadal jest niezdolny do pracy, a leczenie rokuje odzyskanie zdolności",
        "jesli": ["zasiłek chorobowy wyczerpany", "lekarz orzecznik ZUS orzekł, że dalsze leczenie lub rehabilitacja rokują odzyskanie zdolności do pracy",
                  "brak emerytury/renty z tytułu niezdolności do pracy, zasiłku dla bezrobotnych, świadczenia przedemerytalnego, rodzicielskiego itp. (art. 18 ust. 7)"],
        "to": "świadczenie przysługuje przez okres niezbędny do przywrócenia zdolności do pracy, nie dłużej niż 12 miesięcy; wynosi 90% podstawy wymiaru zasiłku chorobowego przez pierwsze 3 miesiące, "
              "75% za pozostały okres, a gdy niezdolność przypada w okresie ciąży – 100%; podstawa podlega waloryzacji kwartalnej (art. 19 ust. 2)",
        "wyjatki": [], "zrodla": [Q_REHAB2, Q_REHAB1],
        "korekty": [{"kod": "B1", "opis": "Reguła dodana ręcznie z art. 18–19 ustawy zasiłkowej (brak w ekstrakcji)."}]})
    log.append(("R-REHAB-01", "B1", "Dodano regułę świadczenia rehabilitacyjnego 90/75/100%, max 12 mies., waloryzacja."))

    json.dump({"tematy": T}, open(dst, "w"), ensure_ascii=False, indent=1)
    for x in log:
        print(" ", *x)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
