"use client";

import { useEffect, useState } from "react";

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
 * 모드:
 *   - 기본: w-full max-w-md, 슬러그 truncate flex-1, blink 커서 표시
 *   - 고정폭 (slugStyle 또는 hideCursor 지정 시): 컨텐츠 폭으로 축소,
 *     슬러그는 inline-block 고정폭, 커서 없음. 크로스 페이드용
 *   - wide: w-full로 컨테이너 채움. 브라우저 주소창 느낌 — 좌측 lock,
 *     중앙 URL, 우측 bookmark/share 아이콘. 슬러그는 좌측 정렬
 *
 * children prop: 제공되면 slug 텍스트 대신 렌더링됨. RotatingSlug 같은
 * 애니메이션 컴포넌트를 슬러그 자리에 끼워 넣을 때 사용.
 * ────────────────────────────────────────────────────────── */
export function NamespacePillPreview({
  slug = "내이름",
  className = "",
  slugStyle,
  hideCursor = false,
  wide = false,
  children,
}: {
  slug?: string;
  className?: string;
  slugStyle?: React.CSSProperties;
  hideCursor?: boolean;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  const isFixedMode = !wide && (!!slugStyle || hideCursor || !!children);
  const containerClass = wide
    ? "flex items-center gap-2.5 pl-4 pr-3 py-3 rounded-full w-full"
    : isFixedMode
      ? "inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full"
      : "inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full w-full max-w-md";
  return (
    <div className={className}>
      <div
        className={containerClass}
        style={{
          background: "var(--surface-lowest)",
          boxShadow: wide
            ? "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6), var(--shadow-whisper)"
            : "var(--shadow-whisper)",
          border: "1px solid var(--surface-container)",
        }}
      >
        {/* lock icon */}
        <svg
          width={wide ? 15 : 14}
          height={wide ? 15 : 14}
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
        {/* URL group — 좌표.to/ + slug 사이 gap 제거, 연속된 URL로 읽힘 */}
        <span
          className={
            wide
              ? "flex items-baseline flex-1 min-w-0"
              : "flex items-baseline min-w-0"
          }
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          <span
            className="text-sm sm:text-base font-medium tracking-tight"
            style={{ color: "var(--on-surface-variant)" }}
          >
            좌표.to/
          </span>
          <span
            className={
              wide
                ? "text-sm sm:text-base font-bold tracking-tight inline-block text-left"
                : isFixedMode
                  ? "text-sm sm:text-base font-bold tracking-tight inline-block text-left"
                  : "text-sm sm:text-base font-bold tracking-tight truncate flex-1"
            }
            style={{
              color: "var(--on-background)",
              ...(slugStyle ?? {}),
            }}
          >
            {children ?? (slug || "내이름")}
          </span>
        </span>
        {wide && (
          <>
            {/* divider — subtle browser chrome detail */}
            <span
              className="block w-px h-5"
              style={{ background: "var(--surface-container)", flexShrink: 0 }}
              aria-hidden="true"
            />
            {/* bookmark / star icon — decorative browser chrome, not interactive */}
            <span
              aria-hidden="true"
              className="flex items-center justify-center w-7 h-7 rounded-full"
              style={{ flexShrink: 0, color: "var(--on-surface-variant)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
          </>
        )}
        {!wide && !hideCursor && !children && (
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
 * 1b. RotatingSlug — 여러 단어를 크로스페이드로 순환
 *
 * 사용처: home 페이지 hero NamespacePillPreview의 슬러그 자리.
 *   <NamespacePillPreview hideCursor>
 *     <RotatingSlug words={["내이름", "우리가게", ...]} />
 *   </NamespacePillPreview>
 *
 * 구현: 모든 단어를 absolute로 겹쳐 렌더, opacity transition으로 크로스페이드.
 * 첫 단어를 relative로 두어 컨테이너 자연 폭을 결정 (대신 invisible spacer가
 * 가장 긴 단어 폭을 보장).
 * ────────────────────────────────────────────────────────── */
export function RotatingSlug({
  words,
  intervalMs = 2200,
}: {
  words: string[];
  intervalMs?: number;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [words.length, intervalMs]);

  // 가장 긴 단어로 컨테이너 폭 확보 (CLS 방지)
  const widest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span
      className="relative inline-block align-baseline"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* invisible spacer — sets min-width to widest word */}
      <span aria-hidden="true" className="invisible">
        {widest}
      </span>
      {words.map((w, i) => (
        <span
          key={w}
          aria-hidden={i === idx ? undefined : true}
          className="absolute inset-0 motion-safe:transition-opacity motion-safe:duration-700 motion-reduce:transition-none"
          style={{
            opacity: i === idx ? 1 : 0,
          }}
        >
          {w}
        </span>
      ))}
    </span>
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
