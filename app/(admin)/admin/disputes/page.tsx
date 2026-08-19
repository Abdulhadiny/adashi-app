import { listDisputes } from "@/lib/data/disputes";
import DisputesClient from "./DisputesClient";

export const dynamic = "force-dynamic";

export default async function DisputesPage() {
  const disputes = await listDisputes();
  return <DisputesClient disputes={disputes} />;
}
