export function parseTimestampAsUTC(timestamp: string | null | undefined): Date {
  if (!timestamp) {
    return new Date();
  }

  const value = timestamp.trim();

  // If the string already contains timezone information, preserve it.
  if (/[zZ]$/.test(value) || /[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(value);
  }

  // PostgreSQL TIMESTAMP values are stored without timezone.
  // When the app receives a bare timestamp string, parse it as UTC so
  // Philippine local time is shown consistently in the UI.
  return new Date(`${value}Z`);
}
