import { redirect } from "next/navigation";
import { getParticipantContext, type ParticipantContext } from "@/lib/data/participant";
import { countMyUnread, listMyNotifications } from "@/lib/data/inapp";
import ParticipantShell from "@/components/participant/ParticipantShell";

export const dynamic = "force-dynamic";

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  let ctx: ParticipantContext;
  try {
    ctx = await getParticipantContext();
  } catch {
    redirect("/login");
  }

  const [notifications, unread] = await Promise.all([listMyNotifications(), countMyUnread()]);

  return (
    <ParticipantShell name={ctx.fullName} notifications={notifications} unread={unread}>
      {children}
    </ParticipantShell>
  );
}
