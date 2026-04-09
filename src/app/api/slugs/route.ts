import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { validateSlug, validateUrl } from "@/lib/slug-validation";
import { fetchOG, type OGResult } from "@/lib/og-fetcher";

/**
 * POST /api/slugs
 *
 * 오너 네임스페이스에 서브링크 생성 + 동기 OG fetch.
 *
 * Request:  { slug: string, target_url: string, namespace_id: string }
 * Response: 200 { id, slug, target_url, og_* }
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

  // 4) 네임스페이스 오너 확인
  const { data: ns } = await supabase
    .from("namespaces")
    .select("id, owner_id")
    .eq("id", namespaceId)
    .maybeSingle();

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

  // 5) 중복 확인
  const { data: existing } = await supabase
    .from("slugs")
    .select("id")
    .eq("namespace_id", namespaceId)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 주소입니다." },
      { status: 409 },
    );
  }

  // 6) OG 동기 fetch (2s timeout)
  const og: OGResult = await fetchOG(targetUrl);

  // 7) INSERT
  const insertRow: Record<string, unknown> = {
    slug,
    target_url: targetUrl,
    namespace_id: namespaceId,
    owner_id: user.id,
  };

  if (og.ok) {
    insertRow.og_title = og.title ?? null;
    insertRow.og_description = og.description ?? null;
    insertRow.og_image = og.image ?? null;
    insertRow.og_site_name = og.site_name ?? null;
    insertRow.og_fetched_at = new Date().toISOString();
    insertRow.og_fetch_error = null;
  } else {
    insertRow.og_fetch_error = og.error;
    insertRow.og_fetched_at = new Date().toISOString();
  }

  const { data: inserted, error: insertError } = await supabase
    .from("slugs")
    .insert(insertRow)
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

  return NextResponse.json(inserted);
}
