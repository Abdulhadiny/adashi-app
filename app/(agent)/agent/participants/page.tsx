import { listMyParticipants } from "@/lib/data/agent";
import ParticipantsClient from "./ParticipantsClient";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage() {
  const participants = await listMyParticipants();
  return <ParticipantsClient participants={participants} />;
}
