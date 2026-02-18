/**
 * Parse an API timestamp as UTC.
 * Backend/Supabase stores timestamps in UTC. If the API returns a string without
 * timezone (e.g. "2025-02-14T10:30:00.000"), JS parses it as local time, causing
 * a ~5h offset for IST users. This forces UTC parsing.
 */
export function parseUTCDate(value) {
  if (value == null || value === '') return null;
  const str = typeof value === 'string' ? value : String(value);
  // If already has timezone (Z or ±HH:MM), use as-is
  if (str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str.trim())) {
    return new Date(str);
  }
  // Otherwise assume UTC and append Z
  return new Date(str.replace(/Z?$/, '') + 'Z');
}
