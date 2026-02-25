export function getCurrentTaxYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Tax year starts April 6
  if (month < 4 || (month === 4 && day < 6)) {
    return `${year - 1}/${(year % 100).toString().padStart(2, "0")}`;
  }
  return `${year}/${((year + 1) % 100).toString().padStart(2, "0")}`;
}

export function daysUntilTaxYearEnd(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  let endYear = year;
  if (month > 4 || (month === 4 && day >= 6)) {
    endYear = year + 1;
  }

  const taxYearEnd = new Date(endYear, 3, 5); // April 5
  const diffTime = taxYearEnd.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
