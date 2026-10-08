"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Compass } from "lucide-react";
import { useFinance } from "@/components/finance/provider";
import { Field, FormError } from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import { accountTypes, parsePaise, type Account } from "@finsight/shared";

export default function OnboardingPage() {
  const { state, update, workspace, createWorkspace, command } = useFinance();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.name);
  const [mode, setMode] = useState("manual");
  const [workspaceName, setWorkspaceName] = useState(workspace?.name ?? "");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<Account["type"]>("Savings");
  const [balance, setBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const created = useRef(false);
  const accountCreated = useRef(false);
  const [error, setError] = useState("");
  async function finish() {
    setBusy(true);
    setError("");
    try {
      if (!workspace && !created.current) {
        await createWorkspace(workspaceName.trim());
        created.current = true;
      }
      if (!state.accounts.length && !accountCreated.current) {
        const raw = balance.trim();
        await command({
          action: "account.create",
          data: {
            name: accountName.trim(),
            type: accountType,
            dueDate: null,
            openingBalance:
              parsePaise(raw.replace(/^-/, ""), { allowZero: true }) *
              (raw.startsWith("-") ? -1 : 1),
          },
        });
        accountCreated.current = true;
      }
      await update((current) => ({
        ...current,
        name: name.trim(),
        onboarded: true,
      }));
      router.push(
        mode === "import" ? "/transactions?action=import" : "/dashboard",
      );
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface mx-auto max-w-xl p-7 sm:p-10">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--mint)] text-[var(--mint-deep)]">
        <Compass size={27} />
      </span>
      <p className="eyebrow mt-8">A clearer beginning · step {step + 1} of 3</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">
        {
          [
            "Make yourself at home.",
            "Choose your starting point.",
            "You are ready to begin.",
          ][step]
        }
      </h2>
      <div className="mt-6 space-y-5">
        {step === 0 && (
          <>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              Your account starts empty. Create a private workspace and add the
              accounts you want to track.
            </p>
            <Field label="What should we call you?">
              <input
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                className="control px-3"
                autoComplete="given-name"
              />
            </Field>
            <Field label="Workspace name">
              <input
                value={workspaceName}
                required
                minLength={2}
                maxLength={80}
                onChange={(event) => setWorkspaceName(event.target.value)}
                className="control px-3"
                disabled={!!workspace}
              />
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <p className="text-sm text-[var(--ink-soft)]">
              Add your first account with its current opening balance.
            </p>
            {state.accounts.length ? (
              <p className="text-sm">
                Your workspace already has {state.accounts.length} accounts.
              </p>
            ) : (
              <>
                <Field label="Account name">
                  <input
                    value={accountName}
                    required
                    maxLength={80}
                    onChange={(event) => setAccountName(event.target.value)}
                    className="control px-3"
                  />
                </Field>
                <Field label="Account type">
                  <select
                    value={accountType}
                    onChange={(event) =>
                      setAccountType(event.target.value as Account["type"])
                    }
                    className="control px-3"
                  >
                    {accountTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Opening balance (INR)">
                  <input
                    value={balance}
                    inputMode="decimal"
                    onChange={(event) => setBalance(event.target.value)}
                    className="control px-3"
                  />
                </Field>
              </>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              {name}, your workspace begins with your own records. Here is the
              simplest path forward:
            </p>
            {[
              "Add your first account",
              "Record your first money move",
              "Give one category a budget",
            ].map((item) => (
              <p key={item} className="flex items-center gap-3 text-sm">
                <Check size={16} className="text-[var(--mint-deep)]" />
                {item}
              </p>
            ))}
            {[
              [
                "manual",
                "Begin with manual tracking",
                "Record your first transaction when you are ready.",
              ],
              [
                "import",
                "Import a statement",
                "Optional CSV or OFX upload with a preview before saving.",
              ],
            ].map(([value, title, copy]) => (
              <label
                key={value}
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${mode === value ? "border-[var(--mint-deep)] bg-[var(--mint)]/30" : ""}`}
              >
                <input
                  type="radio"
                  checked={mode === value}
                  onChange={() => setMode(value)}
                />
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-1 block text-xs text-[var(--ink-soft)]">
                    {copy}
                  </span>
                </span>
              </label>
            ))}
          </>
        )}
        <FormError error={error} />
        <div className="flex justify-between gap-3 pt-4">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
          <Button
            loading={busy}
            disabled={
              !name.trim() ||
              workspaceName.trim().length < 2 ||
              (step > 0 && !state.accounts.length && !accountName.trim())
            }
            onClick={() => (step === 2 ? void finish() : setStep(step + 1))}
          >
            {step === 2 ? "Open my workspace" : "Continue"}
            <ArrowRight size={15} className="ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
