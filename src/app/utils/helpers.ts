export function roundToTwoDecimals(value: number): number {
  if (isNaN(value) || !isFinite(value)) {
    console.warn(`Rounding encountered invalid value: ${value}. Returning 0.`);
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
