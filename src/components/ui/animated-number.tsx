"use client";

import { useEffect, useState } from "react";
import { region } from "@/lib/finance/region";

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let frame = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = display;
    const duration = 650;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
    // Intentionally animate when the value changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display.toLocaleString(region.locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
