# India-first regional contract

`src/lib/finance/region.ts` owns INR, en-IN, Asia/Kolkata, the 100-paise scale and the per-record bound. Full values use Indian digit grouping; compact cards/axes show lakh (L) and crore (Cr) with full amounts available in tables or titles. Dates display DD/MM/YYYY; stored dates stay ISO. Financial-year reports include April 1 through March 31, inclusive, using Kolkata's current date.

Rupee strings are validated before commas are removed, converted with BigInt and bounded before conversion to a safe number. Scientific notation, malformed grouping, negative transaction values and implicit fractional-paise rounding are rejected. Explicit calculator rounding is half-up at the paise boundary. Imports accept quoted Indian commas and DD/MM/YYYY or ISO dates. CSV exports include currency; OFX CURDEF and CSV currency must be INR when present. Currency-less files are interpreted as INR by the import screen's explicit contract; preview before saving.

## Existing data

The new hosted migration changes the default to INR. Only workspaces with **no accounts, entries, budgets or goals** adopt it. Funded legacy USD rows and all money values remain untouched. Such workspaces display their actual currency, support export and reject finance writes. Create a separate INR workspace after exporting; there is no automated FX migration. Arbitrary ISO codes are not accepted because mixed-currency valuation is not implemented.

Demo schema 3 uses a new local-storage key. The old schema 2 key is preserved and downloadable in Settings; a fresh fictional Indian workspace is seeded rather than relabeling old values. Clearing demo data also removes the retained old key. UI copy is English only: Hindi and Kannada have not been professionally translated or reviewed, so those locales are not offered.

The demo is fictional. Account balances are manually tracked and SIP outflows represent recorded cash allocation; investment valuation and double-entry investment transfers are not implemented. Goal contributions earmark existing funds and do not move cash.
