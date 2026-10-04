import { NextRequest } from "next/server";
import { apiResponse, apiError } from "@/lib/utils";
import { getDashboardStats } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const now = new Date();
    const month = parseInt(
      searchParams.get("month") || String(now.getMonth() + 1),
    );
    const year = parseInt(
      searchParams.get("year") || String(now.getFullYear()),
    );
    const result = await getDashboardStats(month, year);
    return apiResponse(result);
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return apiError("Failed to fetch dashboard data", 500);
  }
}
