import { NextRequest } from "next/server";
import { getDashboardStats } from "@/lib/dashboard";
import { buildMonthlyReport } from "@/lib/report";
import { apiError } from "@/lib/utils";

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
    const stats = await getDashboardStats(month, year);
    const report = buildMonthlyReport(stats, month, year);
    const filename = `finsight-report-${year}-${String(month).padStart(2, "0")}.txt`;

    return new Response(report, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD_REPORT_GET]", error);
    return apiError("Failed to generate dashboard report", 500);
  }
}
