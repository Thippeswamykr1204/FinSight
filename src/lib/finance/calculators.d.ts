/** Fixed-rate reducing-balance estimate, monthly interest rounded to paise. */
export declare function amortize(
  principal: number,
  annualRate: number,
  months: number,
): {
  emi: number;
  interest: number;
  total: number;
  schedule: {
    month: number;
    payment: number;
    interest: number;
    principal: number;
    balance: number;
  }[];
};
/** End-of-month SIP; nominal annual assumption / 12, not a guaranteed return. */
export declare function sipProjection(
  monthly: number,
  annualRate: number,
  months: number,
): {
  invested: number;
  value: number;
  growth: number;
};
export declare function goalMonthly(
  target: number,
  saved: number,
  months: number,
): number;
