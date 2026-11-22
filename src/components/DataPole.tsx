"use client";
import { useRef, useState } from "react";
import { Pole } from "./Pole";
import { useT } from "@/lib/jezyk";

const MIN = "1900-01-01";
const MAX = "2100-12-31";

/**
 * Pole daty: natywny input type="date", tak samo jak w kalendarzu ciąży. Zamiast pola tekstowego z maską
 * dostajemy systemowy wybór daty (na telefonie wygodny, dla czytnika ekranu z segmentami dzień/miesiąc/rok).
 * API bez zmian: `value` i `onChange` to data ISO (RRRR-MM-DD) albo pusty tekst. Nowy, opcjonalny `error`
 * pozwala rodzicowi pokazać własny komunikat (np. „pole wymagane").
 */
export function DataPole({ label, hint, error, value, onChange }: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const t = useT();
  const pole = useRef<HTMLInputElement>(null);
  const [wlasny, setWlasny] = useState("");

  // Niepełna data (np. sam dzień i miesiąc) albo rok spoza zakresu: natywne pole zwraca wtedy pusty tekst.
  function sprawdz() {
    const v = pole.current?.validity;
    if (v?.badInput) setWlasny("Uzupełnij dzień, miesiąc i rok.");
    else if (v?.rangeUnderflow || v?.rangeOverflow) setWlasny("Wpisz datę z lat 1900–2100.");
    else setWlasny("");
  }

  return (
    <Pole label={t(label)} hint={hint ? t(hint) : undefined} error={error || wlasny || undefined}>
      <input ref={pole} type="date" min={MIN} max={MAX} autoComplete="off" value={value}
        onBlur={sprawdz}
        onChange={(e) => { setWlasny(""); onChange(e.target.value); }} />
    </Pole>
  );
}
