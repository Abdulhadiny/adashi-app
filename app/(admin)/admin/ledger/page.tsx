import { listAgentsForFilter, listTransactions } from "@/lib/data/ledger";
import LedgerClient from "./LedgerClient";

export const dynamic = "force-dynamic";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const agentId = sp.agentId || undefined;
  const from = sp.from || undefined;
  const to = sp.to || undefined;

  const [result, agents] = await Promise.all([
    listTransactions({ agentId, from, to, page }),
    listAgentsForFilter(),
  ]);

  return (
    <LedgerClient
      rows={result.rows}
      agents={agents}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      filters={{ agentId: agentId ?? "", from: from ?? "", to: to ?? "" }}
    />
  );
}
