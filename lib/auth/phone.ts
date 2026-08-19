// Nigerian phone normalization to E.164 digits (no "+"), used as the OTP + users
// join key. Must be applied identically on send, verify, and provisioning.
// Promoted from the legacy agent/participant App.tsx copies.
export function normalizeNgPhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  // 0803xxxxxxx (local, 11 digits) -> 234803xxxxxxx
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  // already 234xxxxxxxxxx
  if (digits.startsWith("234")) return digits;
  // 803xxxxxxx (10 digits, missing leading 0) -> 234803xxxxxxx
  if (digits.length === 10) return "234" + digits;
  return digits;
}

// A normalized NG mobile number is 234 + 10 digits.
export function isValidNgPhone(input: string): boolean {
  return /^234\d{10}$/.test(normalizeNgPhone(input));
}
