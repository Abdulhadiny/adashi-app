// Display formatting — used at the UI edge only. Money is stored/summed as string
// in SQL; converting to Number here is for presentation, not arithmetic.
import { normalizeNgPhone } from "./auth/phone";

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return naira.format(Number.isFinite(n) ? n : 0);
}

// Phones are stored E.164 (234…, the OTP+users join key) but shown in the
// familiar Nigerian local form — 0803 000 0001 — everywhere in the UI. Display
// only; never feed the result back into a lookup (normalize first for that).
// Falls back to the raw value for anything that isn't a full NG mobile number.
export function formatNgPhone(value: string | null | undefined): string {
  if (!value) return "—";
  const e164 = normalizeNgPhone(value);
  if (!/^234\d{10}$/.test(e164)) return value;
  const local = "0" + e164.slice(3); // 234803… -> 0803…
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

// Turn a free-form phone search fragment into a needle that matches the stored
// E.164 value regardless of how it was typed (0803…, 803…, or 234803…). Returns
// "" for non-phone text so callers can skip the phone branch. Not anchored — a
// partial fragment matches as a substring of the stored number.
export function ngPhoneSearchNeedle(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  return digits;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Compact relative time ("just now", "5m", "3h", "2d") for the notification bell.
// Falls back to a short date beyond a week.
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
}
