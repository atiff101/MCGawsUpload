const MAX_TONNES_PER_DAY = 2500;

export function activityLevelCheck(tonnes, periodStart, periodEnd) {
  const value = Number(tonnes);

  if (!value || value <= 0 || !periodStart || !periodEnd) return null;

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const days = (end - start) / (1000 * 60 * 60 * 24);
  if (days <= 0) return null;

  const perDay = value / days;
  if (perDay > MAX_TONNES_PER_DAY) {
    return `That's about ${Math.round(perDay).toLocaleString()} tonnes a day over this period, unusually high. Double check the figure and the reporting dates.`;
  }
  return null;
}
