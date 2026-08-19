import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

// Root entry: send authenticated users to their role home, everyone else to login.
// (Middleware already gates the role route groups; this handles the bare "/" path.)
export default async function RootPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role) redirect(`/${role}`);
  redirect("/login");
}
