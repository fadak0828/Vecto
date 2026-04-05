import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /go/:slug
 *
 * 무료 단축 URL 리다이렉트.
 * 슬러그 조회 → 만료 확인 → 302 리다이렉트 + click_count 증가.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);

  const supabase = getSupabase();

  // DB 조회
  const { data, error } = await supabase
    .from("slugs")
    .select("id, target_url, expires_at")
    .eq("slug", decoded)
    .is("namespace_id", null)
    .maybeSingle();

  if (error || !data) {
    return new NextResponse(notFoundHtml(decoded), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 만료 확인
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return new NextResponse(expiredHtml(decoded), {
      status: 410,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // click_count 비동기 증가 (응답을 블로킹하지 않음)
  // click_count 비동기 증가 (리다이렉트 응답을 블로킹하지 않음)
  void supabase.rpc("increment_click", { slug_id: data.id });

  return NextResponse.redirect(data.target_url, 302);
}

function notFoundHtml(slug: string) {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>좌표.to - 찾을 수 없음</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb}
.box{text-align:center;padding:2rem}.title{font-size:1.5rem;font-weight:bold;margin-bottom:0.5rem}
.desc{color:#6b7280;margin-bottom:1.5rem}a{color:#2563eb;text-decoration:none}</style></head>
<body><div class="box">
<div class="title">좌표를 찾을 수 없습니다</div>
<div class="desc">/go/${slug}에 해당하는 URL이 없습니다.</div>
<a href="/">좌표.to에서 새로 만들기 →</a>
</div></body></html>`;
}

function expiredHtml(slug: string) {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>좌표.to - 만료됨</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb}
.box{text-align:center;padding:2rem}.title{font-size:1.5rem;font-weight:bold;margin-bottom:0.5rem}
.desc{color:#6b7280;margin-bottom:1.5rem}a{color:#2563eb;text-decoration:none}</style></head>
<body><div class="box">
<div class="title">이 좌표는 만료되었습니다</div>
<div class="desc">/go/${slug}의 유효기간(30일)이 지났습니다.</div>
<a href="/">좌표.to에서 새로 만들기 →</a>
</div></body></html>`;
}
