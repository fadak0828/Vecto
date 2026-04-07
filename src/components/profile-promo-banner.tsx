/**
 * ProfilePromoBanner — 무료 플랜 프로필 페이지에 표시되는 좌표.to 안내 배너.
 *
 * 디자인 결정 (autoplan TD-DESIGN-1 A: masthead, TD-DESIGN-3 A: CTA copy):
 * - 14px text-sm (12px whisper 아님 — 보여야 업그레이드 동기 유발)
 * - surface-container 배경 (profile 배경 surface와 톤 차이)
 * - 민트 dot • accent
 * - max-w-lg 페이지 컨테이너 past full-width bleed 자연스러운 bar
 * - word-break: keep-all + text-wrap: pretty (한국어 orphan 방지)
 * - CTA "프리미엄 시작하기 →"
 * - payment-status 체크는 parent가 수행. 이 컴포넌트는 항상 렌더됨.
 */
export function ProfilePromoBanner() {
  return (
    <div
      className="relative py-3 px-4 mb-8 -mx-6"
      style={{
        background: "var(--surface-container)",
        wordBreak: "keep-all",
        textWrap: "pretty",
      }}
    >
      <p
        className="text-sm text-center"
        style={{
          color: "var(--on-surface-variant)",
          lineHeight: 1.6,
        }}
      >
        <span
          aria-hidden="true"
          className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
          style={{ background: "var(--primary)" }}
        />
        이 페이지는{" "}
        <a
          href="https://좌표.to"
          className="font-semibold hover:underline"
          style={{ color: "var(--primary)" }}
        >
          좌표.to
        </a>
        로 만들어졌어요.{" "}
        <a
          href="https://좌표.to/pricing"
          className="font-semibold hover:underline"
          style={{ color: "var(--primary)" }}
        >
          프리미엄 시작하기 →
        </a>
      </p>
    </div>
  );
}
