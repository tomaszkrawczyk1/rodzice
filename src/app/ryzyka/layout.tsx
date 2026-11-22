import { metadane } from "@/i18n/metadane";

export const generateMetadata = () => metadane(
  "Ubezpieczenie i ochrona w pracy",
  "Na co uważać z ubezpieczeniem chorobowym i ochroną przed zwolnieniem w ciąży i po urodzeniu dziecka."
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
