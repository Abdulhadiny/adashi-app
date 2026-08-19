"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/data/session";
import { resolveDisputeById } from "@/lib/data/disputes";

export async function resolveDisputeAction(id: string, note: string) {
  await requireRole("admin");
  const trimmed = note.trim();
  if (!trimmed) throw new Error("A resolution note is required.");
  await resolveDisputeById(id, trimmed);
  revalidatePath("/admin/disputes");
}
