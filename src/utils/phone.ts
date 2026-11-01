/** Canonical display/import format for Indonesian mobile numbers. */
export function normalizePhone(raw: string): string {
  const phone = raw.replace(/[^0-9]/g, "");
  if (phone.startsWith("08")) return `62${phone.slice(1)}`;
  if (phone.startsWith("8")) return `62${phone}`;
  return phone;
}

/** Readable phone label; stored/exported values remain canonical. */
export function formatPhone(raw: string): string {
  const phone = normalizePhone(raw);
  if (!phone.startsWith("628")) return raw;
  const national = phone.slice(2);
  const groups = [national.slice(0, 3)];
  for (let i = 3; i < national.length; i += 4) {
    groups.push(national.slice(i, i + 4));
  }
  return `+62 ${groups.join("-")}`;
}
