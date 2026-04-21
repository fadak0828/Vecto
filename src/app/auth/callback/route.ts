import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Open redirect 방지용 next 파라미터 검증.
 * `new URL()` 파싱으로 whitespace/backslash/인코딩 우회를 모두 차단.
 * (startsWith 만으로는 `/\tevil.com` 같은 payload 가 통과할 수 있음.)
 */
function validateNextParam(
  nextParam: string | null,
  origin: string
): string {
  if (!nextParam) return "/dashboard";
  try {
    const parsed = new URL(nextParam, origin);
    // 동일 origin 이어야 하며, 호스트 변경을 허용하는 경로는 거부.
    if (parsed.origin !== origin) return "/dashboard";
    // 결과 pathname 이 "/" 로 시작하지 않으면(이론상 불가) 방어.
    if (!parsed.pathname.startsWith("/")) return "/dashboard";
    // `//evil.com` 같이 parsed.origin 은 같아도 pathname 이 "//..." 인 경우를 한 번 더 차단.
    if (parsed.pathname.startsWith("//")) return "/dashboard";
    return parsed.pathname + parsed.search;
  } catch {
    return "/dashboard";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const safeDest = validateNextParam(searchParams.get("next"), origin);

  // Google 등 provider 가 직접 error 로 리다이렉트한 경우
  // (예: 사용자가 consent 화면에서 취소 → ?error=access_denied).
  // 원본 코드 그대로 쿼리로 전달해 login 페이지가 정확한 메시지를 보여주게 함.
  if (providerError && !code) {
    const errCode = encodeURIComponent(providerError);
    return NextResponse.redirect(
      `${origin}/auth/login?error=${errCode}`
    );
  }

  if (code) {
    // `auth=success` 마커는 클라이언트 Providers 가 감지해 signup_completed 를
    // 발화 + identify 한 뒤 replaceState 로 제거한다. UTM 은 sessionStorage 에
    // 있으므로 서버에서는 접근 불가 — 발화를 클라이언트로 위임.
    const destUrl = new URL(safeDest, origin);
    destUrl.searchParams.set("auth", "success");
    const response = NextResponse.redirect(destUrl);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
