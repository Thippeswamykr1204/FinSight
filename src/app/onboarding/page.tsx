"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Compass } from "lucide-react";
import { useFinance } from "@/components/finance/provider";
import { Field, FormError } from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const { state, update } = useFinance();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.name);
  const [mode, setMode] = useState("sample");
  const [error, setError] = useState("");
  function finish() {
    try {
      update((current) => ({
        ...current,
        name: name.trim() || "Your",
        onboarded: true,
        ...(mode === "empty"
          ? { accounts: [], transactions: [], budgets: [], goals: [] }
          : {}),
      }));
      router.push(mode === "empty" ? "/accounts" : "/dashboard");
    } catch (caught) {
      setError(String(caught));
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
              This is a private, browser-local demo. There is no signup, bank
              connection, or payment required.
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
          </>
        )}
        {step === 1 && (
          <>
            <p className="text-sm text-[var(--ink-soft)]">
              Use realistic sample data, or begin with a clean workspace.
            </p>
            {[
              [
                "sample",
                "Keep sample data",
                "Explore a complete financial picture.",
              ],
              [
                "empty",
                "Start fresh",
                "Clear existing demo data and add your own manual account.",
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
        {step === 2 && (
          <>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              {name || "Your"}, your workspace will{" "}
              {mode === "empty" ? "start empty" : "keep its sample data"}. Here
              is the simplest path forward:
            </p>
            {[
              "Add or review an account",
              "Record your first money move",
              "Give one category a budget",
            ].map((item) => (
              <p key={item} className="flex items-center gap-3 text-sm">
                <Check size={16} className="text-[var(--mint-deep)]" />
                {item}
              </p>
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
            disabled={!name.trim()}
            onClick={() => (step === 2 ? finish() : setStep(step + 1))}
          >
            {step === 2 ? "Open my workspace" : "Continue"}
            <ArrowRight size={15} className="ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
