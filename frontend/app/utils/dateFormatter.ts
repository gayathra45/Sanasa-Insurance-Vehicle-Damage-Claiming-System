/**
 * Date & Time Formatting Utilities for Sri Lanka Time (Asia/Colombo / UTC+5:30)
 */

export function formatSriLankaDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "-";
  try {
    const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    if (!d || isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(d);
  } catch (e) {
    return String(dateInput || "-");
  }
}

export function formatSriLankaDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "-";
  try {
    const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    if (!d || isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(d);
  } catch (e) {
    return String(dateInput || "-");
  }
}

export function formatSriLankaTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "-";
  try {
    const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    if (!d || isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(d);
  } catch (e) {
    return String(dateInput || "-");
  }
}
