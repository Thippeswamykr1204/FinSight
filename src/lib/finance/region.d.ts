/** The ledger's regional contract. Formatting never performs currency conversion. */
export declare const region: {
  readonly currency: "INR";
  readonly locale: "en-IN";
  readonly timeZone: "Asia/Kolkata";
  readonly minorUnit: "paise";
  readonly scale: 100;
  readonly maxMinor: 100000000000;
};
export declare function money(
  value: number,
  locale?: string,
  currency?: string,
): string;
/** Minor units in; one decimal lakh/crore out. Full values remain available in the UI. */
export declare function compactMoney(value: number, currency?: string): string;
/** Decimal strings only: validate Indian grouping before removing commas, then use BigInt. */
export declare function parsePaise(
  value: string,
  {
    round,
    allowZero,
  }?: {
    round?: boolean | undefined;
    allowZero?: boolean | undefined;
  },
): number;
export declare const toPaise: (value: string) => number;
export declare function localDate(date?: Date): string;
export declare function displayDate(value: string | Date): string;
export declare function financialYear(value?: string | Date): {
  year: number;
  label: string;
  start: string;
  end: string;
  months: string[];
};
export declare function periodTotals<
  T extends {
    date: string;
    type: string;
    amount: number;
  },
>(
  entries: T[],
  start: string,
  end: string,
): {
  income: number;
  expenses: number;
  saved: number;
};
