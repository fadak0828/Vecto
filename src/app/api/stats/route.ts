import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/stats?namespace_id=xxx
 *
 * 최근 7일간 날짜별 클릭 수 반환.
 */
export async function GET(request: NextRequest) {
  const namespaceId = request.nextUrl.searchParams.get("namespace_id");
  if (!namespaceId) {
    return NextResponse.json({ error: "namespace_id 필요" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 이 네임스페이스의 slug id 목록
  const { data: slugs } = await supabase
    .from("slugs")
    .select("id, slug, click_count")
    .eq("namespace_id", namespaceId);

  if (!slugs || slugs.length === 0) {
    return NextResponse.json({ total: 0, daily: [], links: [] });
  }

  const slugIds = slugs.map((s) => s.id);

  // 최근 7일 날짜별 클릭
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: logs } = await supabase
    .from("click_logs")
    .select("slug_id, clicked_at")
    .in("slug_id", slugIds)
    .gte("clicked_at", sevenDaysAgo)
    .order("clicked_at", { ascending: true });

  // 날짜별 집계
  const dailyMap: Record<string, number> = {};
  (logs ?? []).forEach((log) => {
    const date = log.clicked_at.split("T")[0];
    dailyMap[date] = (dailyMap[date] || 0) + 1;
  });

  // 7일치 빈 날짜 채우기
  const daily: { date: string; clicks: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    daily.push({ date: dateStr, clicks: dailyMap[dateStr] || 0 });
  }

  const total = slugs.reduce((sum, s) => sum + (s.click_count || 0), 0);

  return NextResponse.json({
    total,
    daily,
    links: slugs.map((s) => ({
      slug: s.slug,
      clicks: s.click_count || 0,
    })),
  });
}
