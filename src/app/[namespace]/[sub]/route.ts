import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /:namespace/:sub
 *
 * 네임스페이스 서브링크 리다이렉트.
 * 좌표.to/홍길동/노션 → target_url로 302
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ namespace: string; sub: string }> }
) {
  const { namespace, sub } = await params;
  const nsName = decodeURIComponent(namespace);
  const subSlug = decodeURIComponent(sub);

  try {
    const supabase = getSupabase();

    // 네임스페이스 조회
    const { data: ns } = await supabase
      .from("namespaces")
      .select("id")
      .eq("name", nsName)
      .maybeSingle();

    if (!ns) {
      return new NextResponse(notFoundHtml(nsName, subSlug), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 서브링크 조회
    const { data: link } = await supabase
      .from("slugs")
      .select("id, target_url")
      .eq("namespace_id", ns.id)
      .eq("slug", subSlug)
      .maybeSingle();

    if (!link) {
      return new NextResponse(notFoundHtml(nsName, subSlug), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // click_count 비동기 증가
    void supabase.rpc("increment_click", { slug_id: link.id });

    return NextResponse.redirect(link.target_url, 302);
  } catch {
    return new NextResponse(errorHtml(), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

function notFoundHtml(ns: string, sub: string) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>좌표.to - 찾을 수 없음</title>
<style>body{font-family:Pretendard,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafaf9}
.box{text-align:center;padding:2rem}.title{font-size:1.5rem;font-weight:bold;margin-bottom:.5rem}.desc{color:#78716c;margin-bottom:1.5rem}a{color:#0f766e;text-decoration:none}</style></head>
<body><div class="box"><div class="title">좌표를 찾을 수 없습니다</div><div class="desc">${ns}/${sub}에 해당하는 링크가 없습니다.</div><a href="/${ns}">${ns}의 프로필 보기 →</a></div></body></html>`;
}

function errorHtml() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>좌표.to - 오류</title>
<style>body{font-family:Pretendard,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafaf9}
.box{text-align:center;padding:2rem}.title{font-size:1.5rem;font-weight:bold;margin-bottom:.5rem}.desc{color:#78716c;margin-bottom:1.5rem}a{color:#0f766e;text-decoration:none}</style></head>
<body><div class="box"><div class="title">오류가 발생했습니다</div><div class="desc">잠시 후 다시 시도해주세요.</div><a href="/">좌표.to 메인으로 →</a></div></body></html>`;
}
