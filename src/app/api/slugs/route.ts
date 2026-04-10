import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { validateSlug, validateUrl } from "@/lib/slug-validation";
import { fetchOG } from "@/lib/og-fetcher";

/**
 * POST /api/slugs
 *
 * 오너 네임스페이스에 서브링크 생성.
 *
 * 성능 노트 (2026-04-10):
 *   - 네임스페이스 소유권 체크 + 중복 slug 체크는 독립적 → Promise.all 로 1 왕복.
 *   - OG 메타데이터는 INSERT 이후 백그라운드(`after()`)에서 fetch + UPDATE.
 *     → 응답은 OG 필드 null 인 row 를 즉시 반환. 클라이언트는 잠시 후 refresh.
 *     → 타깃 URL 이 느려도 (max 2s timeout) 사용자가 기다리지 않음.
 *
 * Request:  { slug: string, target_url: string, namespace_id: string }
 * Response: 200 { id, slug, target_url, og_* (전부 null) }
 *           400 { error }   — 검증 실패
 *           401 { error }   — 미인증
 *           403 { error }   — 타 네임스페이스
 *           409 { error }   — 중복 slug
 *           500 { error }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1) 인증
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 2) 파싱
  let body: { slug?: string; target_url?: string; namespace_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const slug = (body.slug ?? "").trim();
  const targetUrl = (body.target_url ?? "").trim();
  const namespaceId = (body.namespace_id ?? "").trim();

  if (!namespaceId) {
    return NextResponse.json(
      { error: "namespace_id가 필요합니다." },
      { status: 400 },
    );
  }

  // 3) 검증
  const slugCheck = validateSlug(slug);
  if (!slugCheck.valid) {
    return NextResponse.json({ error: slugCheck.error }, { status: 400 });
  }

  const urlCheck = validateUrl(targetUrl);
  if (!urlCheck.valid) {
    return NextResponse.json({ error: urlCheck.error }, { status: 400 });
  }

  // 4) 검증 쿼리 병렬: 네임스페이스 소유권 + 중복 slug
  const [nsRes, existingRes] = await Promise.all([
    supabase
      .from("namespaces")
      .select("id, owner_id")
      .eq("id", namespaceId)
      .maybeSingle(),
    supabase
      .from("slugs")
      .select("id")
      .eq("namespace_id", namespaceId)
      .eq("slug", slug)
      .maybeSingle(),
  ]);

  const ns = nsRes.data;
  if (!ns) {
    return NextResponse.json(
      { error: "네임스페이스를 찾을 수 없습니다." },
      { status: 403 },
    );
  }
  if (ns.owner_id !== user.id) {
    return NextResponse.json(
      { error: "이 네임스페이스에 대한 권한이 없습니다." },
      { status: 403 },
    );
  }
  if (existingRes.data) {
    return NextResponse.json(
      { error: "이미 사용 중인 주소입니다." },
      { status: 409 },
    );
  }

  // 5) INSERT — OG 필드는 null 로 두고 백그라운드에서 채움
  const { data: inserted, error: insertError } = await supabase
    .from("slugs")
    .insert({
      slug,
      target_url: targetUrl,
      namespace_id: namespaceId,
      owner_id: user.id,
      og_fetched_at: null,
      og_fetch_error: null,
    })
    .select(
      "id, slug, target_url, namespace_id, og_title, og_description, og_image, og_site_name, og_fetched_at, og_fetch_error",
    )
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "이미 사용 중인 주소입니다." },
        { status: 409 },
      );
    }
    // Log the full DB error server-side, but never echo it to the client —
    // would leak schema details and CHECK violation messages that let a
    // malicious target site fingerprint our constraints.
    console.error("Slug insert failed:", insertError);
    return NextResponse.json(
      { error: "서브링크 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  // 6) 응답 반환 후 백그라운드에서 OG fetch + UPDATE
  //    Vercel/Node 환경에서 `after()` 는 응답이 전송된 뒤에도 서버 함수를
  //    유지해서 작업을 실행한다. 실패하면 row 의 og_fetched_at 이 null 로
  //    유지되고, 후속 PR 에서 cron backfill 로 재시도 (TODOS.md 참고).
  const slugId = inserted.id;
  after(async () => {
    try {
      const og = await fetchOG(targetUrl);
      const patch: Record<string, unknown> = og.ok
        ? {
            og_title: og.title ?? null,
            og_description: og.description ?? null,
            og_image: og.image ?? null,
            og_site_name: og.site_name ?? null,
            og_fetched_at: new Date().toISOString(),
            og_fetch_error: null,
          }
        : {
            og_fetch_error: og.error,
            og_fetched_at: new Date().toISOString(),
          };
      const { error: updateError } = await supabase
        .from("slugs")
        .update(patch)
        .eq("id", slugId);
      if (updateError) {
        console.error("Background OG update failed:", updateError);
      }
    } catch (e) {
      console.error("Background OG fetch threw:", e);
    }
  });

  return NextResponse.json(inserted);
}
