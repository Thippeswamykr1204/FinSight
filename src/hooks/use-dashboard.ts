"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardStats } from "@/types";
import { getCurrentMonthYear } from "@/lib/utils";

export function useDashboard(month?: number, year?: number) {
  const { month: cm, year: cy } = getCurrentMonthYear();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const m = month ?? cm;
      const y = year ?? cy;
      const res = await fetch(`/api/dashboard?month=${m}&year=${y}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Request failed");
      setData(json.data);
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [month, year, cm, cy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
