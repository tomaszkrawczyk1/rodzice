import type { Status } from "@/content/poradnik";
import { STATUS_OPIS } from "@/content/poradnik";

export const StatusBadge = ({ s }: { s: Status }) =>
  s === "ok" ? null : (
    <span className={"badge " + (s === "luka" ? "no" : "warn")}>
      {s === "luka" ? "indywidualna sprawa w ZUS" : "warto potwierdzić w ZUS"}
    </span>
  );

export const StatusNota = ({ s, uwaga }: { s: Status; uwaga?: string }) =>
  s === "ok" ? null : (
    <div className={"alert " + (s === "luka" ? "err" : "warn")} role="note">
      <b>{s === "luka" ? "Nietypowa sytuacja. " : "Warto potwierdzić w ZUS. "}</b>
      {uwaga ?? STATUS_OPIS[s]}
      {s === "luka" && (
        <div className="small mt">
          <a href="/pue">Zadaj pytanie przez konto internetowe (PUE / eZUS)</a> lub skontaktuj się z placówką ZUS.
        </div>
      )}
    </div>
  );

