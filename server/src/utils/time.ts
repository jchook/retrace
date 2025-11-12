export const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000);

export const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);
