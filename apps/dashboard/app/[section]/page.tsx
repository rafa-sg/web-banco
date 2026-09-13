import { notFound } from "next/navigation";
import { Dashboard, type Section } from "@/components/dashboard";

const sections: Section[] = ["riesgo", "conversaciones", "compromisos", "analitica", "escalaciones", "politicas"];

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const valid = sections.find(value => value === section);
  if (!valid) notFound();
  return <Dashboard section={valid} />;
}
