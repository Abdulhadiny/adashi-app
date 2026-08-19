import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/login");

  return <AdminShell phone={session.user.phone}>{children}</AdminShell>;
}
