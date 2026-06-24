import { NextRequest, NextResponse } from "next/server";
import { createShortUrl } from "@/lib/create-short-url";
import { validateUrl } from "@/lib/slug-validation";
import { escapeHtml } from "@/lib/html-escape";

/**
 * GET /api/prefix  (내부 전용 — proxy.ts 에서 rewrite 로만 도달)
 *
 * 주소창 접두어 방식 단축 URL 생성.
 *
 * `만들기.좌표.to` 호스트로 들어온 `https://만들기.좌표.to/<원본URL>` 요청을
 * proxy 가 가로채 원본 URL 을 `x-prefix-original-url` 헤더에 담아 이 경로로
 * rewrite 한다. 여기서 원본 URL 을 검증한 뒤 기존 단축 생성 로직을 호출하고
 * 생성된 단축 URL 로 302 리다이렉트한다.
 *
 * 주의:
 *   - 원본 URL 은 절대 서버에서 fetch 하지 않는다 (SSRF 방지). 저장·리다이렉트
 *     용도로만 처리한다.
 *   - #fragment 는 브라우저가 서버로 전송하지 않으므로 이 방식으로는 보존할 수
 *     없다 (구조적 제약).
 */
export async function GET(request: NextRequest) {
  // proxy 가 디코딩하지 않은 원본 URL 을 헤더로 전달한다.
  const original = request.headers.get("x-prefix-original-url");

  if (!original) {
    return htmlError(
      400,
      "원본 URL이 없습니다",
      "주소창에 <code>만들기.좌표.to/https://원본주소</code> 형식으로 입력해주세요."
    );
  }

  // http/https + 길이 검증. javascript:/data:/file: 등은 여기서 차단된다.
  const urlCheck = validateUrl(original);
  if (!urlCheck.valid) {
    return htmlError(
      400,
      "잘못된 URL",
      escapeHtml(urlCheck.error ?? "올바른 URL 형식이 아닙니다.")
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // 슬러그 생략 → createShortUrl 이 자동 슬러그 생성. (rate limit 포함)
  const result = await createShortUrl({ target_url: original, ip });

  if (!result.ok) {
    const title =
      result.status === 429 ? "생성 한도 초과" : "단축 URL 생성 실패";
    return htmlError(result.status === 429 ? 429 : 400, title, escapeHtml(result.error));
  }

  // 생성된 단축 URL 로 302 리다이렉트.
  return NextResponse.redirect(`https://좌표.to/go/${result.slug}`, 302);
}

function htmlError(status: number, title: string, descHtml: string) {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>좌표.to - ${escapeHtml(title)}</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb}
.box{text-align:center;padding:2rem;max-width:32rem}.title{font-size:1.5rem;font-weight:bold;margin-bottom:0.5rem}
.desc{color:#6b7280;margin-bottom:1.5rem;word-break:break-all}code{background:#f3f4f6;padding:0.1rem 0.3rem;border-radius:0.25rem}a{color:#2563eb;text-decoration:none}</style></head>
<body><div class="box">
<div class="title">${escapeHtml(title)}</div>
<div class="desc">${descHtml}</div>
<a href="https://좌표.to/">좌표.to에서 새로 만들기 →</a>
</div></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  );
}
