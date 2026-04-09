/**
 * OG(Open Graph) 메타데이터 수집기
 *
 * 서브링크 타겟 URL에 대해 og:title, og:description, og:image, og:site_name을
 * 수집한다. SSRF 방어를 위한 레이어가 핵심.
 *
 * SSRF 방어:
 * 1) URL 프로토콜은 http:/https:만
 * 2) DNS lookup 결과 IP가 private/loopback/link-local이면 차단
 *    (TOCTOU 방어: redirect마다 재검증)
 * 3) 2초 timeout, 1MB maxBytes, stream-cut
 *
 * 구현 노트:
 * - 네이티브 fetch + 정규식 파서 사용 (의존성 최소화).
 *   우리는 og:title/description/image/site_name 4개 필드만 필요하므로 정규식으로 충분.
 * - open-graph-scraper / unfurl.js 대비 Vercel Node runtime에서 추가 설치 없이 동작.
 * - `redirect: 'manual'`로 수동 리다이렉트 추적, 각 홉마다 SSRF 재검증.
 */

import { lookup as dnsLookup } from "node:dns/promises";
import { isIP, isIPv4, isIPv6 } from "node:net";

export type OGErrorKind =
  | "timeout"
  | "ssrf_blocked"
  | "http_4xx"
  | "http_5xx"
  | "dns_fail"
  | "parse_error"
  | "no_og_data"
  | "too_large";

export type OGResult =
  | {
      ok: true;
      title?: string;
      description?: string;
      image?: string;
      site_name?: string;
    }
  | { ok: false; error: OGErrorKind };

export interface FetchOGOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** 테스트용 fetch 주입 */
  fetchImpl?: typeof fetch;
  /** 테스트용 DNS 주입 */
  dnsLookupImpl?: (host: string) => Promise<{ address: string; family: number }>;
}

const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_MAX_REDIRECTS = 3;

/**
 * Private/loopback/link-local IP 검사.
 * IPv4: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16,
 *        169.254.0.0/16 (AWS metadata!), 0.0.0.0/8
 * IPv6: ::1 (loopback), fc00::/7 (ULA), fe80::/10 (link-local),
 *        ::ffff:0:0/96 (v4-mapped — 내부에서 v4로 재검사)
 */
export function isPrivateIP(address: string): boolean {
  if (!address) return true;

  // IPv6
  if (address.includes(":")) {
    const lower = address.toLowerCase();
    // Reject if net.isIPv6 rejects it — catches malformed inputs.
    if (!isIPv6(address)) return true;
    if (lower === "::1" || lower === "::" || lower === "0:0:0:0:0:0:0:0")
      return true;

    // v4-mapped ::ffff:a.b.c.d → 재귀
    const v4MappedDecimal = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4MappedDecimal) return isPrivateIP(v4MappedDecimal[1]);

    // v4-mapped hex form ::ffff:7f00:1 — convert last two groups back to v4
    const v4MappedHex = lower.match(
      /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/,
    );
    if (v4MappedHex) {
      const high = parseInt(v4MappedHex[1], 16);
      const low = parseInt(v4MappedHex[2], 16);
      const v4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
      return isPrivateIP(v4);
    }

    // ULA fc00::/7 — 첫 바이트가 fc 또는 fd
    if (/^f[cd][0-9a-f]{0,2}:/.test(lower)) return true;

    // Link-local fe80::/10
    if (/^fe[89ab][0-9a-f]?:/.test(lower)) return true;

    // NAT64 64:ff9b::/96 — embeds any v4 including metadata
    if (lower.startsWith("64:ff9b:")) return true;

    // 6to4 2002::/16 — embeds v4
    if (/^2002:/.test(lower)) return true;

    // 그 외 IPv6는 공개로 간주
    return false;
  }

  // IPv4 — Node's net.isIPv4 only accepts canonical dotted-quad with decimal
  // octets in 0-255. It rejects octal (0177.0.0.1), hex (0x7f.0.0.1), and
  // 32-bit dword (2130706433) notations. We reject anything that doesn't pass
  // this strict check so attackers can't smuggle loopback/metadata IPs past
  // the blocklist (would otherwise be parsed as 127.0.0.1 by undici).
  if (!isIPv4(address)) {
    return true;
  }
  const parts = address.split(".").map((p) => parseInt(p, 10));
  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local + AWS metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 (CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

/**
 * URL의 호스트를 DNS 조회해 public IP인지 검증한다.
 * 모든 resolved IP가 public이어야 통과 (Happy Eyeballs 우회 방지).
 */
async function assertPublicHost(
  hostname: string,
  dnsImpl: (host: string) => Promise<{ address: string; family: number }>,
): Promise<{ ok: true } | { ok: false; error: "ssrf_blocked" | "dns_fail" }> {
  // Strip IPv6 brackets for both validation and blocklist check.
  const cleaned = hostname.replace(/^\[|\]$/g, "");

  // IP literal path — identify strictly via net.isIP (rejects non-canonical
  // forms like octal/hex/dword IPv4). Any hostname that "looks like" an IP
  // (contains digits/dots only, or contains `:`) but fails isIP is refused —
  // the URL parser may still normalize it to a private IP downstream.
  const looksLikeIP =
    /^[0-9a-fA-F.:]+$/.test(cleaned) && (cleaned.includes(".") || cleaned.includes(":"));
  if (looksLikeIP) {
    if (isIP(cleaned) === 0) {
      // Looked like an IP but isn't a canonical one (e.g. "0177.0.0.1"). Block.
      return { ok: false, error: "ssrf_blocked" };
    }
    if (isPrivateIP(cleaned)) return { ok: false, error: "ssrf_blocked" };
    return { ok: true };
  }

  // Hostname path — resolve via DNS. Note: this is one-shot resolution, the
  // actual fetch may resolve again (DNS rebinding risk). Mitigation is
  // tracked as a TODO — needs undici Agent with pinned lookup to fix fully.
  try {
    const result = await dnsImpl(cleaned);
    // DNS returned a non-canonical IP? Paranoia — net.isIP catches this too.
    if (isIP(result.address) === 0) {
      return { ok: false, error: "ssrf_blocked" };
    }
    if (isPrivateIP(result.address)) {
      return { ok: false, error: "ssrf_blocked" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "dns_fail" };
  }
}

/**
 * HTML에서 og:* 및 <title>을 정규식으로 추출한다.
 * 의도적으로 느슨한 파서 — malformed HTML에서도 최대한 많이 건진다.
 */
export function parseOGTags(html: string): {
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
} {
  const result: {
    title?: string;
    description?: string;
    image?: string;
    site_name?: string;
  } = {};

  // <meta property="og:xxx" content="yyy"> 혹은 content가 먼저 오는 경우 모두 허용
  const metaRegex = /<meta\s+[^>]*>/gi;
  const metas = html.match(metaRegex) ?? [];

  for (const meta of metas) {
    // property 또는 name 속성
    const propMatch = meta.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = meta.match(/content\s*=\s*["']([^"']*)["']/i);
    if (!propMatch || !contentMatch) continue;

    const prop = propMatch[1].toLowerCase();
    const content = decodeHtmlEntities(contentMatch[1].trim());
    if (!content) continue;

    if (prop === "og:title" && !result.title) result.title = content;
    else if (prop === "og:description" && !result.description)
      result.description = content;
    else if (prop === "og:image" && !result.image) result.image = content;
    else if (prop === "og:site_name" && !result.site_name)
      result.site_name = content;
  }

  // <title> 폴백 (og:title이 없을 때만)
  if (!result.title) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      const t = decodeHtmlEntities(titleMatch[1].trim());
      if (t) result.title = t;
    }
  }

  return result;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)));
}

/**
 * Response body를 maxBytes까지만 읽는다. 초과 시 `too_large` 신호.
 */
async function readBoundedText(
  res: Response,
  maxBytes: number,
): Promise<{ ok: true; text: string } | { ok: false; error: "too_large" | "parse_error" }> {
  if (!res.body) {
    // body 없음 — 작은 응답이면 text()로 시도
    try {
      const text = await res.text();
      if (text.length > maxBytes) return { ok: false, error: "too_large" };
      return { ok: true, text };
    } catch {
      return { ok: false, error: "parse_error" };
    }
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          return { ok: false, error: "too_large" };
        }
        chunks.push(value);
      }
    }
  } catch {
    return { ok: false, error: "parse_error" };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(merged);
    return { ok: true, text };
  } catch {
    return { ok: false, error: "parse_error" };
  }
}

/**
 * 타겟 URL의 OG 메타데이터를 수집한다.
 *
 * SSRF 방어:
 * - 매 홉(리다이렉트 포함)마다 DNS lookup + private IP 차단
 * - redirect: 'manual'로 직접 제어
 */
export async function fetchOG(
  rawUrl: string,
  opts: FetchOGOptions = {},
): Promise<OGResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const dnsImpl =
    opts.dnsLookupImpl ??
    (async (host: string) => {
      const r = await dnsLookup(host);
      return { address: r.address, family: r.family };
    });

  let currentUrl: URL;
  try {
    currentUrl = new URL(rawUrl);
  } catch {
    return { ok: false, error: "parse_error" };
  }

  if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
    return { ok: false, error: "ssrf_blocked" };
  }

  // Strip userinfo — `http://user:pass@target/` would send
  // `Authorization: Basic ...` upstream, leaking any creds embedded in the
  // slug's target_url. We don't need auth for OG scraping.
  currentUrl.username = "";
  currentUrl.password = "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let hops = 0;
    // 리다이렉트 루프
    for (;;) {
      if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
        return { ok: false, error: "ssrf_blocked" };
      }

      // TOCTOU 방어: 매 홉마다 DNS 재검증
      const dnsCheck = await assertPublicHost(currentUrl.hostname, dnsImpl);
      if (!dnsCheck.ok) return { ok: false, error: dnsCheck.error };

      let res: Response;
      try {
        res = await fetchImpl(currentUrl.toString(), {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            // 일부 서버는 UA 없이 차단
            "user-agent":
              "Mozilla/5.0 (compatible; VectoBot/1.0; +https://xn--h25b29s.to)",
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          return { ok: false, error: "timeout" };
        }
        return { ok: false, error: "dns_fail" };
      }

      // 리다이렉트 처리
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return { ok: false, error: "parse_error" };
        hops++;
        if (hops > maxRedirects) return { ok: false, error: "parse_error" };
        try {
          currentUrl = new URL(loc, currentUrl);
        } catch {
          return { ok: false, error: "parse_error" };
        }
        // Protocol and userinfo re-validation after redirect.
        if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
          return { ok: false, error: "ssrf_blocked" };
        }
        currentUrl.username = "";
        currentUrl.password = "";
        // 응답 body 소비하지 않고 다음 홉으로
        try {
          await res.body?.cancel();
        } catch {
          // ignore
        }
        continue;
      }

      if (res.status >= 400 && res.status < 500) {
        return { ok: false, error: "http_4xx" };
      }
      if (res.status >= 500) {
        return { ok: false, error: "http_5xx" };
      }

      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
      if (contentType && !contentType.includes("html") && !contentType.includes("xml")) {
        return { ok: false, error: "parse_error" };
      }

      const bodyRead = await readBoundedText(res, maxBytes);
      if (!bodyRead.ok) return { ok: false, error: bodyRead.error };

      const tags = parseOGTags(bodyRead.text);

      // og:image 상대 URL → 절대 URL 변환
      if (tags.image) {
        try {
          tags.image = new URL(tags.image, currentUrl).toString();
        } catch {
          // 파싱 실패 시 필드 제거
          delete tags.image;
        }
      }

      const hasAny =
        tags.title || tags.description || tags.image || tags.site_name;
      if (!hasAny) return { ok: false, error: "no_og_data" };

      // Truncate to DB CHECK constraint limits (supabase/012) with safety
      // margin. Without this, a malicious target site can serve a 900KB
      // og:description, which would trigger Postgres CHECK violation on
      // insert and 500 the slug creation endpoint. CHECK limits: title 500,
      // description 2000, image 2048, site_name 200.
      return {
        ok: true,
        title: truncate(tags.title, 500),
        description: truncate(tags.description, 2000),
        image: truncate(tags.image, 2048),
        site_name: truncate(tags.site_name, 200),
      };
    }
  } finally {
    clearTimeout(timer);
  }
}

function truncate(value: string | undefined, maxLen: number): string | undefined {
  if (!value) return value;
  // char_length in Postgres counts Unicode code points — match that.
  const chars = Array.from(value);
  if (chars.length <= maxLen) return value;
  return chars.slice(0, maxLen).join("");
}
