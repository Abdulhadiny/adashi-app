import { redirect } from "next/navigation";
import { getParticipantContext, type ParticipantContext } from "@/lib/data/participant";
import ParticipantShell from "@/components/participant/ParticipantShell";

export const dynamic = "force-dynamic";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  let ctx: ParticipantContext;
  try {
    ctx = await getParticipantContext();
  } catch {
    redirect("/login");
  }
  return <ParticipantShell name={ctx.fullName}>{children}</ParticipantShell>;
}
