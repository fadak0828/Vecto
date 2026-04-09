import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { fetchOG, type OGResult } from "@/lib/og-fetcher";

/**
 * POST /api/slugs/:id/refresh-og
 *
 * 서브링크의 OG 메타데이터를 재수집한다. 오너만 가능.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 대상 slug 조회
  const { data: slugRow } = await supabase
    .from("slugs")
    .select("id, namespace_id, target_url")
    .eq("id", id)
    .maybeSingle();

  if (!slugRow) {
    return NextResponse.json(
      { error: "서브링크를 찾을 수 없습니다." },
      { status: 403 },
    );
  }

  if (!slugRow.namespace_id) {
    return NextResponse.json(
      { error: "이 서브링크는 OG 재수집이 불가능합니다." },
      { status: 403 },
    );
  }

  // 오너 검증
  const { data: ns } = await supabase
    .from("namespaces")
    .select("owner_id")
    .eq("id", slugRow.namespace_id)
    .maybeSingle();

  if (!ns || ns.owner_id !== user.id) {
    return NextResponse.json(
      { error: "이 서브링크에 대한 권한이 없습니다." },
      { status: 403 },
    );
  }

  // OG 재수집
  const og: OGResult = await fetchOG(slugRow.target_url);

  const updateRow: Record<string, unknown> = {
    og_fetched_at: new Date().toISOString(),
  };
  if (og.ok) {
    updateRow.og_title = og.title ?? null;
    updateRow.og_description = og.description ?? null;
    updateRow.og_image = og.image ?? null;
    updateRow.og_site_name = og.site_name ?? null;
    updateRow.og_fetch_error = null;
  } else {
    updateRow.og_fetch_error = og.error;
    // 실패 시 기존 og 필드는 보존 (stale이라도 있는 게 낫다)
  }

  const { data: updated, error: updateError } = await supabase
    .from("slugs")
    .update(updateRow)
    .eq("id", id)
    .select(
      "id, slug, target_url, namespace_id, og_title, og_description, og_image, og_site_name, og_fetched_at, og_fetch_error",
    )
    .single();

  if (updateError) {
    console.error("Refresh OG failed:", updateError);
    return NextResponse.json(
      { error: "OG 재수집에 실패했습니다: " + updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json(updated);
}
