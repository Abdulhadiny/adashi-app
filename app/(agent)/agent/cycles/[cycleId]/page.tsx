import { notFound } from "next/navigation";
import { getCycleDetail } from "@/lib/data/agent";
import CycleDetailClient from "./CycleDetailClient";

export const dynamic = "force-dynamic";

export default async function CycleDetailPage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const detail = await getCycleDetail(cycleId);
  if (!detail) notFound();
  return <CycleDetailClient detail={detail} />;
}
