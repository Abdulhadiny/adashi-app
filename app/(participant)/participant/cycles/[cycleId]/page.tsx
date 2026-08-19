import { notFound } from "next/navigation";
import { getMyPlanDetail } from "@/lib/data/participant";
import PlanDetailClient from "./PlanDetailClient";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const detail = await getMyPlanDetail(cycleId);
  if (!detail) notFound();
  return <PlanDetailClient detail={detail} />;
}
