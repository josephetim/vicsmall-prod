export const PRICES = {
  premiumKobo: 5_500_000,
  singleKobo: 2_200_000,
  sharedCanopyKobo: 5_930_000,
  sharedSlotKobo: 1_482_500,
} as const;

export const formatNaira = (amount: number): string =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

export function formatNairaFromKobo(kobo: number): string {
  return formatNaira(kobo / 100);
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
