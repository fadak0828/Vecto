import { randomBytes, randomUUID } from "crypto";
import { getSupabase } from "@/lib/supabase";
import { validateSlug, validateUrl } from "@/lib/slug-validation";

/**
 * 무료 단축 URL 생성 공용 로직.
 *
 * `/api/shorten` (사용자 지정 슬러그) 와 `/api/prefix` (주소창 접두어 방식,
 * 자동 슬러그) 가 동일한 검증·rate limit·DB 삽입 경로를 공유한다.
 *
 *   - slug 지정 → 기존 동작 (네임스페이스/슬러그 충돌 검사 후 삽입)
 *   - slug 생략 → 랜덤 슬러그 자동 생성 + 충돌 시 재시도
 */

export type CreateOk = {
  ok: true;
  id: string;
  slug: string;
  delete_token: string;
  expires_at: string;
};

export type CreateErr = {
  ok: false;
  status: 409 | 422 | 429 | 500;
  error: string;
  suggested?: string;
  retry_after?: "tomorrow" | "1 hour";
};

export type CreateResult = CreateOk | CreateErr;

/** 자동 슬러그 알파벳 (소문자 + 숫자). SLUG_REGEX 의 부분집합이라 항상 유효. */
const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const AUTO_SLUG_LENGTH = 7;
const AUTO_SLUG_MAX_RETRIES = 6;

/** 모듈로 편향이 무시 가능한 수준이라 단순 `% len` 사용 (36 vs 256). */
function generateSlug(length = AUTO_SLUG_LENGTH): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return out;
}

type InsertResult =
  | { ok: true; data: { id: string; slug: string; expires_at: string } }
  | { ok: false; code?: string; message: string };

async function insertSlug(
  supabase: ReturnType<typeof getSupabase>,
  slug: string,
  target_url: string,
  deleteToken: string,
  expiresAt: string,
  ip: string
): Promise<InsertResult> {
  const { data, error } = await supabase
    .from("slugs")
    .insert({
      slug,
      target_url,
      delete_token: deleteToken,
      expires_at: expiresAt,
      created_by_ip: ip,
    })
    .select("id, slug, expires_at")
    .single();

  if (error) return { ok: false, code: error.code, message: error.message };
  return { ok: true, data };
}

function checkRateLimit(
  dailyCount: number | null,
  monthlyCount: number | null
): CreateErr | null {
  if ((dailyCount ?? 0) >= 10) {
    return {
      ok: false,
      status: 429,
      error: "일일 생성 한도(10개)를 초과했습니다.",
      retry_after: "tomorrow",
    };
  }
  if ((monthlyCount ?? 0) >= 30) {
    return {
      ok: false,
      status: 429,
      error: "월간 생성 한도(30개)를 초과했습니다.",
    };
  }
  return null;
}

export async function createShortUrl(params: {
  target_url: string;
  ip: string;
  /** 생략 시 랜덤 슬러그 자동 생성 */
  slug?: string;
}): Promise<CreateResult> {
  const { target_url, ip } = params;

  // URL 검증 (http/https + 길이 상한). SSRF 방지를 위해 서버에서 fetch 하지 않고
  // 형식 검증만 한다.
  const urlCheck = validateUrl(target_url);
  if (!urlCheck.valid) {
    return { ok: false, status: 422, error: urlCheck.error! };
  }

  const userSlug = params.slug;
  if (userSlug !== undefined) {
    const slugCheck = validateSlug(userSlug);
    if (!slugCheck.valid) {
      return { ok: false, status: 422, error: slugCheck.error! };
    }
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: "서버 설정 오류: " + (e instanceof Error ? e.message : String(e)),
    };
  }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  const dailyQuery = () =>
    supabase
      .from("slugs")
      .select("*", { count: "exact", head: true })
      .eq("created_by_ip", ip)
      .gte("created_at", today);
  const monthlyQuery = () =>
    supabase
      .from("slugs")
      .select("*", { count: "exact", head: true })
      .eq("created_by_ip", ip)
      .gte("created_at", monthStart);

  const deleteToken = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // ── 사용자 지정 슬러그 경로 (기존 /api/shorten 동작 유지) ──────────────
  // rate limit + 네임스페이스/슬러그 충돌을 1 round-trip(Promise.all)으로 확인.
  if (userSlug !== undefined) {
    const [
      { count: dailyCount },
      { count: monthlyCount },
      { data: nsConflict },
      { data: existing },
    ] = await Promise.all([
      dailyQuery(),
      monthlyQuery(),
      supabase.from("namespaces").select("id").eq("name", userSlug).maybeSingle(),
      supabase
        .from("slugs")
        .select("id")
        .eq("slug", userSlug)
        .is("namespace_id", null)
        .maybeSingle(),
    ]);

    const rl = checkRateLimit(dailyCount, monthlyCount);
    if (rl) return rl;

    if (nsConflict) {
      return {
        ok: false,
        status: 409,
        error: "이 이름은 네임스페이스로 사용 중입니다.",
        suggested: userSlug + "2",
      };
    }
    if (existing) {
      return {
        ok: false,
        status: 409,
        error: "이미 사용 중인 주소입니다.",
        suggested: userSlug + "2",
      };
    }

    const ins = await insertSlug(
      supabase,
      userSlug,
      target_url,
      deleteToken,
      expiresAt,
      ip
    );
    if (ins.ok) {
      return {
        ok: true,
        id: ins.data.id,
        slug: ins.data.slug,
        delete_token: deleteToken,
        expires_at: ins.data.expires_at,
      };
    }
    if (ins.code === "23505") {
      return {
        ok: false,
        status: 409,
        error: "이미 사용 중인 주소입니다.",
        suggested: userSlug + "2",
      };
    }
    console.error("Slug creation failed:", ins.message);
    return { ok: false, status: 500, error: "URL 생성에 실패했습니다: " + ins.message };
  }

  // ── 자동 슬러그 경로 (주소창 접두어 방식) ─────────────────────────────
  // 멱등화: 주소창 접두어 방식은 GET 이라 브라우저 prefetch + 실제 내비게이션,
  // 또는 새로고침으로 같은 요청이 여러 번 들어온다. 같은 IP 가 같은 원본 URL 로
  // 만든 미만료 슬러그가 이미 있으면 새로 만들지 않고 그것을 재사용한다.
  // (중복 슬러그 양산 방지 — 동시 요청 race 는 드물어 v1 에서 허용 가능한 잔여
  //  위험으로 둔다.)
  const nowIso = new Date().toISOString();
  const { data: dup } = await supabase
    .from("slugs")
    .select("id, slug, expires_at")
    .eq("created_by_ip", ip)
    .eq("target_url", target_url)
    .is("namespace_id", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dup) {
    return {
      ok: true,
      id: dup.id,
      slug: dup.slug,
      delete_token: deleteToken,
      expires_at: dup.expires_at,
    };
  }

  const [{ count: dailyCount }, { count: monthlyCount }] = await Promise.all([
    dailyQuery(),
    monthlyQuery(),
  ]);
  const rl = checkRateLimit(dailyCount, monthlyCount);
  if (rl) return rl;

  for (let attempt = 0; attempt < AUTO_SLUG_MAX_RETRIES; attempt++) {
    const slug = generateSlug();
    // 자동 생성 슬러그는 항상 패턴에 맞지만, 만에 하나 금칙어면 재생성.
    if (!validateSlug(slug).valid) continue;

    const ins = await insertSlug(
      supabase,
      slug,
      target_url,
      deleteToken,
      expiresAt,
      ip
    );
    if (ins.ok) {
      return {
        ok: true,
        id: ins.data.id,
        slug: ins.data.slug,
        delete_token: deleteToken,
        expires_at: ins.data.expires_at,
      };
    }
    // unique 충돌이면 다른 슬러그로 재시도, 그 외 에러는 즉시 중단.
    if (ins.code !== "23505") {
      console.error("Auto-slug creation failed:", ins.message);
      return {
        ok: false,
        status: 500,
        error: "URL 생성에 실패했습니다: " + ins.message,
      };
    }
  }

  return {
    ok: false,
    status: 500,
    error: "단축 URL 생성에 실패했습니다. 다시 시도해주세요.",
  };
}
