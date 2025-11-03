const dtf = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "short",
  timeStyle: "medium",
  hour12: false,
  timeZone: "UTC",
});

export function formatDateTimeUTC(iso: string) {
  return dtf.format(new Date(iso));
}

export function formatRelativeTime(input: any) {
  const now = new Date();
  let thenMs: number | null = null;
  // Firestore Timestamp support
  if (input && typeof input.toMillis === "function") {
    try { thenMs = input.toMillis(); } catch { thenMs = null; }
  }
  if (thenMs === null) {
    if (typeof input === "number") {
      thenMs = input;
    } else if (typeof input === "string") {
      const d = new Date(input);
      thenMs = isNaN(d.getTime()) ? null : d.getTime();
    } else if (input instanceof Date) {
      thenMs = input.getTime();
    }
  }
  if (thenMs === null || !isFinite(thenMs)) return "now";
  const diffSeconds = Math.floor((now.getTime() - thenMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
  ];
  let value = diffSeconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (let i = 0; i < units.length; i++) {
    const [d, u] = units[i];
    if (Math.abs(value) < d) {
      unit = u;
      break;
    }
    value = Math.floor(value / d);
    unit = u;
  }
  return rtf.format(-value, unit);
}


