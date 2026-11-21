import Link from "next/link";
import { notFound } from "next/navigation";
import SprawaWidok from "@/components/Sprawa";
import { SPRAWY, sprawa } from "@/lib/sprawy";

export const generateStaticParams = () => SPRAWY.map((s) => ({ id: s.id }));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${sprawa(id)?.tytul ?? "Sprawa"} – Przewodnik Przyszłego Rodzica` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!sprawa(id)) notFound();
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
      <div className="zus-layout__main"><SprawaWidok id={id} /></div>
    </div>
  );
}
