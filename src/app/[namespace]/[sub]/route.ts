import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { escapeHtml } from "@/lib/html-escape";

/**
 * GET /:namespace/:sub
 *
 * 네임스페이스 서브링크 리다이렉트.
 * 좌표.to/[내이름]/노션 → target_url로 302
 *
 * 카카오톡/페북/트위터 등 소셜 크롤러는 302를 따라가지 않고 최초 URL의
 * 메타 태그만 읽는다. 기본 302로 응답하면 좌표.to 루트의 opengraph-image가
 * 대신 노출되어 "브랜드 이미지가 뜨고 실제 타겟 썸네일은 안 보이는" 문제가
 * 생긴다.
 *
 * 해결: 크롤러 user-agent가 감지되면 302 대신 HTML 응답을 돌려준다. HTML에는
 * 저장된 og_* 필드(og-fetcher가 생성 시점에 타겟 URL에서 직접 긁어온 값)로
 * 메타 태그를 채운다. 일반 브라우저는 계속 302로 빠르게 리다이렉트된다.
 */

/**
 * 소셜 크롤러/링크 프리뷰 봇 감지. 리스트는 보수적으로 — 일반 브라우저는
 * 302 유지. 테스트에서 재사용하기 위해 export.
 */
export const BOT_UA_REGEX =
  /kakaotalk-scrap|kakaotalk|facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|linkedinbot|whatsapp|line-?bot|naver|daum|googlebot|bingbot|yandexbot|baiduspider|duckduckbot|embedly|nuzzel|bitlybot|pinterest|redditbot|skype|applebot/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ namespace: string; sub: string }> }
) {
  const { namespace, sub } = await params;
  const userAgent = request.headers.get("user-agent") ?? "";
  const isBot = BOT_UA_REGEX.test(userAgent);

  let nsName: string;
  let subSlug: string;
  try {
    nsName = decodeURIComponent(namespace);
    subSlug = decodeURIComponent(sub);
  } catch {
    return new NextResponse(errorHtml(), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const supabase = getSupabase();

    // 네임스페이스 조회 (결제 상태 포함)
    const { data: ns } = await supabase
      .from("namespaces")
      .select("id, payment_status, paid_until")
      .eq("name", nsName)
      .maybeSingle();

    if (!ns) {
      return new NextResponse(notFoundHtml(nsName, subSlug), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 결제 상태 체크
    // - free: 전 기능 무제한 → 통과 (BM: README.md)
    // - expired 30일+: 만료 후 grace period 종료 → 차단
    // - active or expired (0-30일): 통과
    if (ns.payment_status === "expired" && ns.paid_until) {
      const daysSinceExpiry = Math.floor(
        (Date.now() - new Date(ns.paid_until).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceExpiry > 30) {
        return new NextResponse(expiredHtml(nsName), {
          status: 410,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }

    // 서브링크 조회 — 봇 응답을 위해 og_* 필드 포함
    const { data: link } = await supabase
      .from("slugs")
      .select(
        "id, target_url, expires_at, og_title, og_description, og_image, og_site_name",
      )
      .eq("namespace_id", ns.id)
      .eq("slug", subSlug)
      .maybeSingle();

    if (!link) {
      return new NextResponse(notFoundHtml(nsName, subSlug), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 만료 확인
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new NextResponse(notFoundHtml(nsName, subSlug), {
        status: 410,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // click_count 비동기 증가
    void supabase.rpc("increment_click", { slug_id: link.id });

    // 봇이면 타겟의 OG 메타를 담은 HTML을 반환 — 카카오톡/페북 등이 302를
    // 안 따라가도 타겟 사이트의 썸네일/제목이 정상 노출된다. 사람은 meta
    // refresh로 즉시 target_url로 이동.
    if (isBot) {
      return new NextResponse(
        sharePreviewHtml({
          targetUrl: link.target_url,
          nsName,
          subSlug,
          ogTitle: link.og_title ?? null,
          ogDescription: link.og_description ?? null,
          ogImage: link.og_image ?? null,
          ogSiteName: link.og_site_name ?? null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    }

    return NextResponse.redirect(link.target_url, 302);
  } catch {
    return new NextResponse(errorHtml(), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

/**
 * 소셜 크롤러용 HTML. 카카오톡/페북/트위터 등이 302를 따라가지 않아도
 * 타겟 사이트(유튜브, 노션, 개인 블로그 등)의 썸네일/제목이 링크 프리뷰에
 * 나온다. meta refresh로 일반 브라우저도 즉시 리다이렉트.
 *
 * 저장된 og_* 필드가 있으면 그대로 사용. 없으면 최소 메타 태그만 (크롤러는
 * 대개 빈 썸네일로 fallback). 핵심은 좌표.to의 루트 OG 이미지가 대신
 * 삽입되는 걸 막는 것.
 */
export function sharePreviewHtml(opts: {
  targetUrl: string;
  nsName: string;
  subSlug: string;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogSiteName: string | null;
}) {
  const { targetUrl, nsName, subSlug, ogTitle, ogDescription, ogImage, ogSiteName } = opts;
  const title = ogTitle ?? `${nsName}/${subSlug}`;
  const safeTargetUrl = escapeHtml(targetUrl);
  const safeTitle = escapeHtml(title);
  const descMeta = ogDescription
    ? `<meta name="description" content="${escapeHtml(ogDescription)}">
<meta property="og:description" content="${escapeHtml(ogDescription)}">
<meta name="twitter:description" content="${escapeHtml(ogDescription)}">`
    : "";
  const imageMeta = ogImage
    ? `<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
<meta name="twitter:card" content="summary_large_image">`
    : '<meta name="twitter:card" content="summary">';
  const siteNameMeta = ogSiteName
    ? `<meta property="og:site_name" content="${escapeHtml(ogSiteName)}">`
    : "";
  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<meta property="og:title" content="${safeTitle}">
<meta name="twitter:title" content="${safeTitle}">
<meta property="og:url" content="${safeTargetUrl}">
<meta property="og:type" content="website">
${siteNameMeta}
${descMeta}
${imageMeta}
<meta http-equiv="refresh" content="0;url=${safeTargetUrl}">
</head><body><a href="${safeTargetUrl}">${safeTitle}</a></body></html>`;
}

function notFoundHtml(ns: string, sub: string) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>좌표.to - 찾을 수 없음</title>
<style>body{font-family:Pretendard,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafaf9}
.box{text-align:center;padding:2rem}.title{font-size:1.5rem;font-weight:bold;margin-bottom:.5rem}.desc{color:#78716c;margin-bottom:1.5rem}a{color:#0f766e;text-decoration:none}</style></head>
<body><div class="box"><div class="title">좌표를 찾을 수 없습니다</div><div class="desc">${escapeHtml(ns)}/${escapeHtml(sub)}에 해당하는 링크가 없습니다.</div><a href="/${escapeHtml(ns)}">${escapeHtml(ns)}의 프로필 보기 →</a></div></body></html>`;
}

function expiredHtml(ns: string) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>좌표.to - 이용권 만료</title>
<style>body{font-family:Pretendard,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafaf9}
.box{text-align:center;padding:2rem}.title{font-size:1.5rem;font-weight:bold;margin-bottom:.5rem}.desc{color:#78716c;margin-bottom:1.5rem}a{color:#0f766e;text-decoration:none}</style></head>
<body><div class="box"><div class="title">이용권이 만료되었습니다</div><div class="desc">${escapeHtml(ns)}의 이용권이 만료되어 리다이렉트가 중지되었습니다.</div><a href="https://좌표.to/pricing">이용권 갱신하기 →</a></div></body></html>`;
}

function errorHtml() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>좌표.to - 오류</title>
<style>body{font-family:Pretendard,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafaf9}
.box{text-align:center;padding:2rem}.title{font-size:1.5rem;font-weight:bold;margin-bottom:.5rem}.desc{color:#78716c;margin-bottom:1.5rem}a{color:#0f766e;text-decoration:none}</style></head>
<body><div class="box"><div class="title">오류가 발생했습니다</div><div class="desc">잠시 후 다시 시도해주세요.</div><a href="/">좌표.to 메인으로 →</a></div></body></html>`;
}
