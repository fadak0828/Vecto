import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateSlug, validateUrl } from "@/lib/slug-validation";
import { randomUUID } from "crypto";

/**
 * POST /api/shorten
 *
 * 무료 한글 URL 단축. 회원가입 불필요.
 *
 * Request:  { slug: string, target_url: string }
 * Response: 200 { id, slug, delete_token, expires_at }
 *           409 { error, suggested }
 *           422 { error }
 *           429 { error, retry_after }
 */
export async function POST(request: NextRequest) {
  // Rate limit check (IP 기반)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const { slug, target_url } = await request.json().catch(() => ({
    slug: "",
    target_url: "",
  }));

  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return NextResponse.json(
      { error: "서버 설정 오류: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }

  // 슬러그 유효성 검증
  const slugCheck = validateSlug(slug);
  if (!slugCheck.valid) {
    return NextResponse.json({ error: slugCheck.error }, { status: 422 });
  }

  // URL 유효성 검증
  const urlCheck = validateUrl(target_url);
  if (!urlCheck.valid) {
    return NextResponse.json({ error: urlCheck.error }, { status: 422 });
  }

  // IP 기반 일일/월간 제한 확인
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  const { count: dailyCount } = await supabase
    .from("slugs")
    .select("*", { count: "exact", head: true })
    .eq("created_by_ip", ip)
    .gte("created_at", today);

  if ((dailyCount ?? 0) >= 10) {
    return NextResponse.json(
      { error: "일일 생성 한도(10개)를 초과했습니다.", retry_after: "tomorrow" },
      { status: 429 }
    );
  }

  const { count: monthlyCount } = await supabase
    .from("slugs")
    .select("*", { count: "exact", head: true })
    .eq("created_by_ip", ip)
    .gte("created_at", monthStart);

  if ((monthlyCount ?? 0) >= 30) {
    return NextResponse.json(
      { error: "월간 생성 한도(30개)를 초과했습니다." },
      { status: 429 }
    );
  }

  // 네임스페이스 충돌 확인
  const { data: nsConflict } = await supabase
    .from("namespaces")
    .select("id")
    .eq("name", slug)
    .maybeSingle();

  if (nsConflict) {
    const suggested = slug + "2";
    return NextResponse.json(
      {
        error: "이 이름은 네임스페이스로 사용 중입니다.",
        suggested,
      },
      { status: 409 }
    );
  }

  // 슬러그 충돌 확인
  const { data: existing } = await supabase
    .from("slugs")
    .select("id")
    .eq("slug", slug)
    .is("namespace_id", null)
    .maybeSingle();

  if (existing) {
    // 대안 제안: 숫자 접미사
    const suggested = slug + "2";
    return NextResponse.json(
      {
        error: "이미 사용 중인 슬러그입니다.",
        suggested,
      },
      { status: 409 }
    );
  }

  // 삭제 토큰 생성 (UUID v4, 122비트 엔트로피)
  const deleteToken = randomUUID();
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // DB 삽입
  const { data, error } = await supabase
    .from("slugs")
    .insert({
      slug,
      target_url,
      delete_token: deleteToken,
      expires_at: expiresAt,
      created_by_ip: ip,
    })
    .select("id, slug, expires_at")
    .single();

  if (error) {
    console.error("Slug creation failed:", error);
    return NextResponse.json(
      { error: "URL 생성에 실패했습니다: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: data.id,
    slug: data.slug,
    delete_token: deleteToken,
    expires_at: data.expires_at,
    url: `${request.nextUrl.origin}/go/${data.slug}`,
  });
}
