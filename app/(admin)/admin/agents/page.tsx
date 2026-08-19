import { listAgents } from "@/lib/data/agents";
import AgentsClient from "./AgentsClient";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await listAgents();
  return <AgentsClient agents={agents} />;
}
