import Link from "next/link";
import { notFound } from "next/navigation";
import SprawaWidok from "@/components/Sprawa";
import { SPRAWY, sprawa } from "@/lib/sprawy";

export const generateStaticParams = () => SPRAWY.map((s) => ({ id: s.id }));

// Lista spraw jest znana w czasie budowania, więc każdy inny adres /sprawa/… dostaje 404 już na poziomie routera,
// z gotowego (wyrenderowanego na serwerze) HTML-a strony 404. Bez tego nieznane id było renderowane na żądanie
// i treść 404 dochodziła dopiero po stronie klienta. notFound() niżej zostaje jako zabezpieczenie.
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${sprawa(id)?.tytul ?? "Sprawa"} – Przewodnik Przyszłego Rodzica` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = sprawa(id);
  if (!s) notFound();
  // Treść sprawy (tytuł, wprowadzenie, pierwsze pytanie) renderuje się na serwerze w SprawaWidok, bo dla gościa nie
  // zależy od przeglądarki. Sprawa bez pytań ma od razu gotowy wynik: liczymy go tu i przekazujemy jako zwykłe dane.
  const wstepny = s.pytania.length ? undefined : await s.licz({}, {}, async () => { throw new Error("Brak API na serwerze"); }).catch(() => undefined);
  return (
    <div className="zus-layout">
      <nav className="zus-side" aria-label="Sprawy">
        <p className="zus-side__h">Sprawy</p>
        <ul>
          {SPRAWY.map((s) => (
            <li key={s.id} className={s.id === id ? "on" : undefined}>
              <Link href={`/sprawa/${s.id}`} aria-current={s.id === id ? "page" : undefined}>{s.tytul}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="zus-layout__main"><SprawaWidok id={id} wstepny={wstepny} /></div>
    </div>
  );
}
