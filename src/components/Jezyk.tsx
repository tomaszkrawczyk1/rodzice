"use client";
import { JEZYKI, NAZWY_JEZYKOW } from "@/i18n/jezyki";
import { useJezyk } from "@/lib/jezyk";

/**
 * Wybór języka: polski, angielski, ukraiński. Wariant "menu" jest w panelu menu na telefonie (z pełnymi nazwami),
 * wariant "pasek" w nagłówku na komputerze (skróty PL / EN / UA). Nazwy języków są zawsze we własnym języku
 * i mają atrybut lang, żeby czytnik ekranu czytał je poprawną wymową.
 */
export default function Jezyk({ wariant = "pasek" }: { wariant?: "pasek" | "menu" }) {
  const { jezyk, ustaw, t } = useJezyk();
  const naMenu = wariant === "menu";
  return (
    <span className={"lang" + (naMenu ? " lang--menu" : "")} role="group" aria-label={t("Język")}>
      {JEZYKI.map((j) => (
        <button key={j} type="button" lang={j} aria-pressed={jezyk === j} aria-label={NAZWY_JEZYKOW[j].pelna} title={NAZWY_JEZYKOW[j].pelna} onClick={() => jezyk !== j && ustaw(j)}>
          {naMenu ? NAZWY_JEZYKOW[j].pelna : NAZWY_JEZYKOW[j].krotko}
        </button>
      ))}
    </span>
  );
}
