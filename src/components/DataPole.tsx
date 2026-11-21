"use client";
import { useEffect, useRef, useState } from "react";
import { dataZFormularza } from "@/lib/data-formularza";
import { dataKrotka } from "@/lib/format";
import { Pole } from "./Pole";

export function DataPole({ label, hint, value, onChange }: {
  label: string;
  hint?: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const [tekst, setTekst] = useState(() => value ? dataKrotka(value) : "");
  const [sprawdz, setSprawdz] = useState(false);
  const ostatnia = useRef(value);
  const pole = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === ostatnia.current) return;
    ostatnia.current = value;
    pole.current?.setCustomValidity("");
    setTekst(value ? dataKrotka(value) : "");
    setSprawdz(false);
  }, [value]);

  const blad = sprawdz && tekst.trim() && !dataZFormularza(tekst);
  return (
    <Pole label={label} hint={blad ? "Wpisz prawidłową datę, np. 5.04.2027." : [hint, "Dzień.miesiąc.rok, np. 5.04.2027."].filter(Boolean).join(" ")}>
      <input ref={pole} type="text" inputMode="decimal" enterKeyHint="next" autoComplete="off" autoCapitalize="off" placeholder="np. 5.04.2027" value={tekst} aria-invalid={blad ? true : undefined}
        onBlur={() => setSprawdz(true)}
        onChange={(e) => {
          const wartosc = e.target.value;
          const iso = dataZFormularza(wartosc);
          e.target.setCustomValidity(wartosc.trim() && !iso ? "Wpisz datę w formacie dzień.miesiąc.rok." : "");
          setTekst(wartosc);
          setSprawdz(false);
          ostatnia.current = iso;
          onChange(iso);
        }} />
    </Pole>
  );
}
