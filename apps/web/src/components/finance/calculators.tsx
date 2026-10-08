"use client";
import { useState } from "react";
import { Field, FormError, PageHeading } from "./primitives";
import { Button } from "@/components/ui/button";
import { amortize, sipProjection, goalMonthly } from "@finsight/shared";
import { money, parsePaise, toPaise, download } from "@finsight/shared";

type Result = {
  labels: Record<string, number>;
  schedule?: ReturnType<typeof amortize>["schedule"];
};
export function PlanningCalculators() {
  const [kind, setKind] = useState("EMI");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  function calculate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const amount = toPaise(String(data.get("amount")));
      const months = Number(data.get("months"));
      const rate = Number(data.get("rate") ?? 0);
      if (kind === "EMI") {
        const loan = amortize(amount, rate, months);
        setResult({
          labels: {
            "Monthly EMI": loan.emi,
            "Total interest": loan.interest,
            "Total repayment": loan.total,
          },
          schedule: loan.schedule,
        });
      } else if (kind === "SIP") {
        const sip = sipProjection(amount, rate, months);
        setResult({
          labels: {
            "Amount invested": sip.invested,
            "Illustrative value": sip.value,
            "Illustrative growth": sip.growth,
          },
        });
      } else
        setResult({
          labels: {
            "Monthly saving needed": goalMonthly(
              amount,
              parsePaise(String(data.get("saved")), { allowZero: true }),
              months,
            ),
          },
        });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Check the values.");
    }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeading
        eyebrow="Plan in rupees"
        title="A number you can plan around."
        description="EMI, SIP and goal estimates with their assumptions in plain view."
      />
      <div className="flex flex-wrap gap-2" aria-label="Calculator selection">
        {["EMI", "SIP", "Goal"].map((value) => (
          <Button
            key={value}
            variant={kind === value ? "secondary" : "outline"}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value);
              setResult(null);
              setError("");
            }}
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <form key={kind} onSubmit={calculate} className="surface space-y-5 p-7">
          <h2 className="text-xl font-semibold">
            {kind === "EMI"
              ? "Loan repayment estimate"
              : kind === "SIP"
                ? "Monthly investment scenario"
                : "Reach a savings target"}
          </h2>
          <Field
            label={
              kind === "EMI"
                ? "Loan principal (INR)"
                : kind === "SIP"
                  ? "Monthly SIP (INR)"
                  : "Goal target (INR)"
            }
          >
            <input
              name="amount"
              inputMode="decimal"
              required
              defaultValue={
                kind === "EMI"
                  ? "5,00,000"
                  : kind === "SIP"
                    ? "5,000"
                    : "1,00,000"
              }
              className="control px-3"
            />
          </Field>
          {kind !== "Goal" ? (
            <Field
              label={
                kind === "EMI"
                  ? "Annual interest rate (%)"
                  : "Assumed annual return (%)"
              }
            >
              <input
                name="rate"
                type="number"
                min="0"
                max="40"
                step="0.01"
                required
                defaultValue={kind === "EMI" ? "9" : "8"}
                className="control px-3"
              />
            </Field>
          ) : (
            <Field label="Already saved (INR)">
              <input
                name="saved"
                inputMode="decimal"
                required
                defaultValue="0"
                className="control px-3"
              />
            </Field>
          )}
          <Field label="Term (months)">
            <input
              name="months"
              type="number"
              min="1"
              max="600"
              required
              defaultValue={kind === "EMI" ? "60" : "120"}
              className="control px-3"
            />
          </Field>
          <FormError error={error} />
          <Button type="submit">Calculate estimate</Button>
        </form>
        <section className="surface p-7" aria-live="polite">
          <h2 className="text-xl font-semibold">Your estimate</h2>
          {result ? (
            <dl className="mt-7 space-y-6">
              {Object.entries(result.labels).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-[var(--ink-soft)]">{label}</dt>
                  <dd className="mt-2 break-words text-3xl font-semibold tabular-nums">
                    {money(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-5 text-sm text-[var(--ink-soft)]">
              Choose your assumptions and calculate to see the result.
            </p>
          )}
          <p className="mt-7 text-xs leading-6 text-[var(--ink-soft)]">
            {kind === "EMI"
              ? "Fixed rate, reducing monthly balance, interest rounded to paise and adjusted final payment. Excludes fees, insurance, prepayments and rate changes; your lender's schedule may differ."
              : kind === "SIP"
                ? "Contributions at month end; nominal annual return divided by 12 and compounded monthly. Excludes taxes, fees and inflation. Returns can be negative and are not guaranteed."
                : "Equal monthly savings, rounded up to a paise. No returns or inflation assumed."}{" "}
            Estimates, not financial or tax advice. No money moves and results
            are not stored.
          </p>
        </section>
      </div>
      {result?.schedule && (
        <section className="surface p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Amortization schedule</h2>
            <Button
              variant="outline"
              onClick={() =>
                download(
                  "month,payment_INR,interest_INR,principal_INR,balance_INR\r\n" +
                    result
                      .schedule!.map((row) =>
                        [
                          row.month,
                          ...[
                            row.payment,
                            row.interest,
                            row.principal,
                            row.balance,
                          ].map((value) => (value / 100).toFixed(2)),
                        ].join(","),
                      )
                      .join("\r\n"),
                  "finsight-emi-estimate.csv",
                  "text/csv",
                )
              }
            >
              Download schedule CSV
            </Button>
          </div>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm">
              View monthly payments
            </summary>
            <div className="mt-4 max-h-96 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    {[
                      "Month",
                      "Payment",
                      "Interest",
                      "Principal",
                      "Balance",
                    ].map((label) => (
                      <th key={label} className="p-2">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((row) => (
                    <tr key={row.month} className="border-t">
                      {[
                        row.month,
                        ...[
                          row.payment,
                          row.interest,
                          row.principal,
                          row.balance,
                        ].map((value) => money(value)),
                      ].map((value, index) => (
                        <td key={index} className="p-2 tabular-nums">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
