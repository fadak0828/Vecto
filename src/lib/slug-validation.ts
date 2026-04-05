/**
 * 슬러그 유효성 검증
 *
 * 허용: 현대 한글 완성형(가-힣), 영문(a-z, A-Z), 숫자(0-9), 하이픈(-)
 * 최대 30자
 */
const SLUG_REGEX = /^[가-힣a-zA-Z0-9\-]{1,30}$/;

/** 무료 슬러그용 금칙어 (확장 가능) */
const BANNED_SLUGS = new Set([
  "admin",
  "api",
  "go",
  "login",
  "signup",
  "settings",
  "dashboard",
  "help",
  "about",
  "privacy",
  "terms",
]);

export function validateSlug(slug: string): {
  valid: boolean;
  error?: string;
} {
  if (!slug || slug.length === 0) {
    return { valid: false, error: "주소를 입력해주세요." };
  }

  if (slug.length > 30) {
    return { valid: false, error: "주소는 30자 이하여야 합니다." };
  }

  if (!SLUG_REGEX.test(slug)) {
    return {
      valid: false,
      error: "한글, 영문, 숫자, 하이픈만 사용할 수 있습니다.",
    };
  }

  if (BANNED_SLUGS.has(slug.toLowerCase())) {
    return { valid: false, error: "이 이름은 사용할 수 없습니다." };
  }

  return { valid: true };
}

export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.length === 0) {
    return { valid: false, error: "URL을 입력해주세요." };
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "http 또는 https URL만 가능합니다." };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "올바른 URL 형식이 아닙니다." };
  }
}
