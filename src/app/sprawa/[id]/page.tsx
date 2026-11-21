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
  return <SprawaWidok id={id} />;
}
