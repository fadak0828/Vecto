"use client";

/**
 * 프리미엄 혜택 미니 미리보기 컴포넌트.
 * 모두 inline SVG + CSS, 외부 의존성/이미지 없음.
 * 모션은 motion-safe: prefix로 reduced-motion 자동 처리.
 *
 * 사용처: PaymentStatus(free), Dashboard claim 화면, home 페이지 teaser.
 *
 * keyframes (ppv-blink, ppv-fade-up, ppv-grow) + reduced-motion 무효화는
 * globals.css에 정의되어 있다 — `<style>`을 컴포넌트 트리 안에 (특히 `<a>` 안에)
 * 인라인으로 두면 hydration mismatch가 발생하므로 글로벌로 옮김.
 */

/* ──────────────────────────────────────────────────────────
 * 1. NamespacePillPreview — 브라우저 주소 바 스타일 pill
 *
 * 기본 모드: w-full max-w-md, 슬러그 truncate flex-1, blink 커서 표시.
 * 고정폭 모드 (slugStyle 또는 hideCursor 지정 시): 컨텐츠 폭으로 축소,
 * 슬러그는 inline-block 고정폭, 커서 없음. 크로스 페이드용.
 * ────────────────────────────────────────────────────────── */
export function NamespacePillPreview({
  slug = "내이름",
  className = "",
  slugStyle,
  hideCursor = false,
}: {
  slug?: string;
  className?: string;
  slugStyle?: React.CSSProperties;
  hideCursor?: boolean;
}) {
  const isFixedMode = !!slugStyle || hideCursor;
  return (
    <div className={className}>
      <div
        className={
          isFixedMode
            ? "inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full"
            : "inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full w-full max-w-md"
        }
        style={{
          background: "var(--surface-lowest)",
          boxShadow: "var(--shadow-whisper)",
          border: "1px solid var(--surface-container)",
        }}
      >
        {/* lock icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--primary)", flexShrink: 0 }}
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span
          className="text-sm sm:text-base font-medium tracking-tight truncate"
          style={{
            fontFamily: "Manrope, sans-serif",
            color: "var(--on-surface-variant)",
          }}
        >
          좌표.to/
        </span>
        <span
          className={
            isFixedMode
              ? "text-sm sm:text-base font-bold tracking-tight inline-block text-left"
              : "text-sm sm:text-base font-bold tracking-tight truncate flex-1"
          }
          style={{
            fontFamily: "Manrope, sans-serif",
            color: "var(--on-background)",
            ...(slugStyle ?? {}),
          }}
        >
          {slug || "내이름"}
        </span>
        {!hideCursor && (
          <span
            className="ppv-blink inline-block w-[2px] h-4 motion-safe:[animation:ppv-blink_1.1s_steps(1)_infinite]"
            style={{ background: "var(--primary)", flexShrink: 0 }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * 2. ProfileCardPreview — 프로필 페이지 미니 목업
 * ────────────────────────────────────────────────────────── */
export function ProfileCardPreview({
  displayName = "홍길동",
  className = "",
}: {
  displayName?: string;
  className?: string;
}) {
  const links = ["노션", "깃허브", "인스타"];
  const initial = (displayName || "내이름").trim().charAt(0) || "내";

  return (
    <div
      className={`p-4 rounded-2xl ${className}`}
      style={{
        background: "var(--surface-lowest)",
        boxShadow: "var(--shadow-whisper)",
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0"
          style={{
            background:
              "linear-gradient(135deg, var(--primary), var(--primary-container))",
            fontFamily: "Manrope, sans-serif",
          }}
          aria-hidden="true"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-bold truncate"
            style={{
              fontFamily: "Manrope, sans-serif",
              color: "var(--on-background)",
            }}
          >
            {displayName || "내이름"}
          </p>
          <p
            className="text-xs truncate"
            style={{ color: "var(--on-surface-variant)" }}
          >
            좌표.to/{(displayName || "내이름").toLowerCase()}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {links.map((label, i) => (
          <div
            key={label}
            className="ppv-fade-up flex items-center justify-between px-3 py-2 rounded-lg motion-safe:opacity-0 motion-safe:[animation:ppv-fade-up_0.5s_ease-out_forwards]"
            style={{
              background: "var(--surface-low)",
              animationDelay: `${0.15 + i * 0.12}s`,
            }}
          >
            <span
              className="text-xs font-medium"
              style={{ color: "var(--on-background)" }}
            >
              /{label}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--on-surface-variant)" }}
              aria-hidden="true"
            >
              →
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * 3. ClickChartPreview — 클릭 분석 미니 차트
 * ────────────────────────────────────────────────────────── */
export function ClickChartPreview({ className = "" }: { className?: string }) {
  // 7일 더미 데이터 (월~일)
  const bars = [30, 55, 42, 70, 95, 80, 60];
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const max = Math.max(...bars);

  return (
    <div
      className={`p-4 rounded-2xl ${className}`}
      role="img"
      aria-label="7일 클릭 통계 미리보기"
      style={{
        background: "var(--surface-lowest)",
        boxShadow: "var(--shadow-whisper)",
      }}
    >
      <div className="flex items-baseline gap-1.5 mb-3">
        <span
          className="text-2xl font-extrabold leading-none"
          style={{
            fontFamily: "Manrope, sans-serif",
            color: "var(--on-background)",
          }}
        >
          24
        </span>
        <span
          className="text-xs font-medium"
          style={{ color: "var(--on-surface-variant)" }}
        >
          오늘 클릭
        </span>
      </div>
      <div className="flex items-end justify-between gap-1 h-14">
        {bars.map((v, i) => (
          <div
            key={days[i]}
            className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
          >
            <div
              className="ppv-grow w-full rounded-t-sm motion-safe:[transform-origin:bottom] motion-safe:[animation:ppv-grow_0.7s_ease-out_forwards]"
              style={{
                height: `${(v / max) * 100}%`,
                background:
                  i === 4
                    ? "var(--primary)"
                    : "rgba(0,101,101,0.35)",
                animationDelay: `${i * 0.06}s`,
              }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <div className="flex items-end justify-between gap-1 mt-1.5">
        {days.map((d, i) => (
          <span
            key={d}
            className="flex-1 text-center text-[10px]"
            style={{
              color:
                i === 4 ? "var(--primary)" : "var(--on-surface-variant)",
              fontWeight: i === 4 ? 700 : 400,
            }}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
