"use client";

import { useState, useEffect, useCallback } from "react";
import type { Transaction, PaginatedResponse } from "@/types";

interface UseTransactionsOptions {
  page?: number;
  limit?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

interface UseTransactionsReturn {
  data: PaginatedResponse<Transaction> | null;
  loading: boolean;
  error: string;
  refetch: () => void;
}

export function useTransactions(
  options: UseTransactionsOptions = {}
): UseTransactionsReturn {
  const { page = 1, limit = 20, category, startDate, endDate } = options;
  const [data, setData] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(category && { category }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      const res = await fetch(`/api/transactions?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Request failed");
      setData(json.data);
    } catch (e: any) {
      setError(e.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page, limit, category, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
