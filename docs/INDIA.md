# India finance contract

`packages/shared/src/finance/region.ts` owns INR, en-IN, Asia/Kolkata, the
100-paise scale and amount bounds. Full values use Indian digit grouping;
compact cards/axes use lakh (L) and crore (Cr). Stored dates are ISO; displayed
dates use DD/MM/YYYY. Financial years run April 1 through March 31 inclusive.

Decimal rupee input is validated before comma removal and converted using BigInt.
Scientific notation, malformed grouping and implicit fractional-paise rounding
are rejected. Calculators use explicit half-up rounding. Imports accept quoted
Indian commas and DD/MM/YYYY or ISO dates; explicit non-INR statements are rejected.
CSV export includes currency. Preview and deduplication precede import.

Accounts are manual finance containers, not bank synchronization or asset-valuation
engines. Goal contributions earmark funds without changing net worth. SIP/EMI/goal
calculators estimate outcomes from visible assumptions and do not move money.
English (India) is the supported UI locale.
