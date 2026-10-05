import { region } from "./region";

function validate(amount: number, rate: number, months: number) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > region.maxMinor ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > 40 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 600
  )
    throw new Error(
      "Use a positive INR amount, 0–40% annual rate, and 1–600 months.",
    );
}
function bounded(value: number) {
  const rounded = Math.round(value);
  if (!Number.isSafeInteger(rounded) || rounded > region.maxMinor)
    throw new Error(
      "The projection exceeds the supported amount. Reduce the amount, rate or term.",
    );
  return rounded;
}

/** Fixed-rate reducing-balance estimate, monthly interest rounded to paise. */
export function amortize(
  principal: number,
  annualRate: number,
  months: number,
) {
  validate(principal, annualRate, months);
  const rate = annualRate / 1200;
  const emi = bounded(
    rate
      ? (principal * rate) / -Math.expm1(-months * Math.log1p(rate))
      : principal / months,
  );
  if (emi < 1)
    throw new Error(
      "The monthly payment is below one paise. Shorten the term.",
    );
  let balance = principal;
  const schedule = Array.from({ length: months }, (_, index) => {
    const interest = bounded(balance * rate);
    const payment =
      index === months - 1
        ? balance + interest
        : Math.min(emi, balance + interest);
    const repaid = payment - interest;
    balance -= repaid;
    return { month: index + 1, payment, interest, principal: repaid, balance };
  });
  const interest = schedule.reduce((sum, row) => sum + row.interest, 0);
  bounded(principal + interest);
  return { emi, interest, total: principal + interest, schedule };
}

/** End-of-month SIP; nominal annual assumption / 12, not a guaranteed return. */
export function sipProjection(
  monthly: number,
  annualRate: number,
  months: number,
) {
  validate(monthly, annualRate, months);
  const rate = annualRate / 1200;
  const invested = bounded(monthly * months);
  const value = bounded(
    rate ? (monthly * Math.expm1(months * Math.log1p(rate))) / rate : invested,
  );
  return { invested, value, growth: value - invested };
}

export function goalMonthly(target: number, saved: number, months: number) {
  validate(target, 0, months);
  if (!Number.isSafeInteger(saved) || saved < 0 || saved > target)
    throw new Error("Saved amount must be between zero and the target.");
  return Math.ceil((target - saved) / months);
}
