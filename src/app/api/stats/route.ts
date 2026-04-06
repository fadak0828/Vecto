import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * GET /api/stats?namespace_id=xxx
 *
 * 최근 7일간 날짜별 클릭 수 반환.
 * 인증 필수: 요청자가 해당 namespace의 소유자여야 함.
 */
export async function GET(request: NextRequest) {
  const namespaceId = request.nextUrl.searchParams.get("namespace_id");
  if (!namespaceId) {
    return NextResponse.json({ error: "namespace_id 필요" }, { status: 400 });
  }

  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // namespace 소유권 확인
  const { data: ns } = await supabase
    .from("namespaces")
    .select("id")
    .eq("id", namespaceId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!ns) {
    return NextResponse.json(
      { error: "이 namespace에 대한 권한이 없습니다." },
      { status: 403 }
    );
  }

  // 이 네임스페이스의 slug 목록 (링크별 클릭 수)
  const { data: slugs } = await supabase
    .from("slugs")
    .select("id, slug, click_count")
    .eq("namespace_id", namespaceId);

  if (!slugs || slugs.length === 0) {
    return NextResponse.json({ total: 0, daily: [], links: [] });
  }

  // SQL 집계로 최근 7일 날짜별 클릭 가져오기
  const { data: dailyData } = await supabase.rpc("get_daily_stats", {
    ns_id: namespaceId,
    days: 7,
  });

  // 날짜별 맵 생성
  const dailyMap: Record<string, number> = {};
  (dailyData ?? []).forEach(
    (row: { day: string; total_clicks: number }) => {
      dailyMap[row.day] = Number(row.total_clicks);
    }
  );

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
