import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import AdminShell from "@/components/admin/AdminShell";
import { countMyUnread, listMyNotifications } from "@/lib/data/inapp";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/login");

  const [notifications, unread] = await Promise.all([listMyNotifications(), countMyUnread()]);

  return (
    <AdminShell phone={session.user.phone} notifications={notifications} unread={unread}>
      {children}
    </AdminShell>
  );
}
