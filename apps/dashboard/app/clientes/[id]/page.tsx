import { notFound } from "next/navigation";
import { CustomerDetail } from "@/components/customer-detail";
import { customers } from "@/lib/demo-data";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = customers.find(customer => customer.id === id);
  if (!customer) notFound();
  return <CustomerDetail customer={customer} />;
}
