import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * DELETE /api/slugs/:id
 *
 * 서브링크 삭제. 오너만 가능.
 * PATCH는 descope — 대시보드에 편집 UI 없음.
 */
export async function DELETE(
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

  // 서브링크 조회 + 오너 검증 (namespace_id → namespaces.owner_id)
  const { data: slugRow } = await supabase
    .from("slugs")
    .select("id, namespace_id")
    .eq("id", id)
    .maybeSingle();

  if (!slugRow) {
    return NextResponse.json(
      { error: "서브링크를 찾을 수 없습니다." },
      { status: 403 },
    );
  }

  if (!slugRow.namespace_id) {
    // 무료(네임스페이스 없음) 링크는 이 엔드포인트로 삭제 불가
    return NextResponse.json(
      { error: "이 서브링크는 삭제할 수 없습니다." },
      { status: 403 },
    );
  }

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

  const { error: deleteError } = await supabase
    .from("slugs")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Slug delete failed:", deleteError);
    return NextResponse.json(
      { error: "서브링크 삭제에 실패했습니다: " + deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
