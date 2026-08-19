import { listPendingAgents } from "@/lib/data/approvals";
import ApprovalsClient from "./ApprovalsClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const search = sp.search ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total, pageSize } = await listPendingAgents({ search, page });

  return (
    <ApprovalsClient rows={rows} total={total} page={page} pageSize={pageSize} search={search} />
  );
}
