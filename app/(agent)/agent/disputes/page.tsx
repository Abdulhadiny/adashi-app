import { listMyDisputes } from "@/lib/data/agent";
import AgentDisputesClient from "./AgentDisputesClient";

export const dynamic = "force-dynamic";

export default async function AgentDisputesPage() {
  const disputes = await listMyDisputes();
  return <AgentDisputesClient disputes={disputes} />;
}
