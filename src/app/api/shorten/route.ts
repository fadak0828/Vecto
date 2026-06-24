import { NextRequest, NextResponse } from "next/server";
import { createShortUrl } from "@/lib/create-short-url";

/**
 * POST /api/shorten
 *
 * 무료 한글 URL 단축. 회원가입 불필요.
 *
 * Request:  { slug: string, target_url: string }
 * Response: 200 { id, slug, delete_token, expires_at, url }
 *           409 { error, suggested }
 *           422 { error }
 *           429 { error, retry_after }
 *
 * 검증·rate limit·DB 삽입은 createShortUrl() 공용 로직에 위임한다
 * (주소창 접두어 방식 /api/prefix 와 동일 경로 공유).
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const { slug, target_url } = await request.json().catch(() => ({
    slug: "",
    target_url: "",
  }));

  const result = await createShortUrl({ slug, target_url, ip });

  if (!result.ok) {
    const body: { error: string; suggested?: string; retry_after?: string } = {
      error: result.error,
    };
    if (result.suggested) body.suggested = result.suggested;
    if (result.retry_after) body.retry_after = result.retry_after;
    return NextResponse.json(body, { status: result.status });
  }

  return NextResponse.json({
    id: result.id,
    slug: result.slug,
    delete_token: result.delete_token,
    expires_at: result.expires_at,
    url: `https://좌표.to/go/${result.slug}`,
  });
}
