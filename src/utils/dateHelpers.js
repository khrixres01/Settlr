/**
 * ISO 8601 week number (week starts on Monday, week 1 = first week with Thursday).
 */
export function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function getCurrentYear(date = new Date()) {
  return date.getFullYear();
}

/** Returns 1-based month number. */
export function getCurrentMonth(date = new Date()) {
  return date.getMonth() + 1;
}

export function getMonthName(month) {
  return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}
