export function roundToTwoDecimals(value: number): number {
  if (isNaN(value) || !isFinite(value)) {
    console.warn(`Problem beim Runden des Wertes: ${value}. 0 wird als Ersatzwert verwendet.`);
    return 0;
  }
  return Number(Math.round(Number(value + 'e+2')) + 'e-2');
}

export function getMonthEndDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getNextMonthEndDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 2, 0);
}
