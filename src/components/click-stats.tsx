"use client";

import { useEffect, useState } from "react";
import { ClickChartPreview } from "./premium-previews";

type Stats = {
  total: number;
  daily: { date: string; clicks: number }[];
  links: { slug: string; clicks: number }[];
};

/**
 * ClickStats — 클릭 통계 대시보드.
 *
 * CEO-E1 paid gate (D-M4):
 *   isPaid=false → 블러 + "프리미엄에서 확인하세요" lock card
 *   isPaid=true  → 실제 통계 렌더
 */
export function ClickStats({
  namespaceId,
  isPaid = false,
}: {
  namespaceId: string;
  isPaid?: boolean;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isPaid) {
      setLoading(false);
      return;
    }
    fetch(`/api/stats?namespace_id=${namespaceId}`)
      .then((r) => {
        if (!r.ok) throw new Error("stats fetch failed");
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [namespaceId, isPaid]);

  // Paid gate — free 사용자는 blurred preview + upsell
  if (!isPaid) {
    return (
      <div
        className="relative p-5 rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface-lowest)",
          boxShadow: "var(--shadow-whisper)",
        }}
      >
        <div
          className="pointer-events-none select-none"
          style={{ filter: "blur(4px)", opacity: 0.6 }}
          aria-hidden="true"
        >
          <ClickChartPreview />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--primary)" }}
          >
            프리미엄 전용
          </p>
          <p
            className="font-bold mb-3 break-keep"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--on-background)",
            }}
          >
            클릭 통계 대시보드
          </p>
          <a
            href="/pricing"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), var(--primary-container))",
            }}
          >
            프리미엄 시작하기 →
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="p-5 rounded-2xl text-center text-sm"
        style={{ background: "var(--surface-lowest)", color: "var(--on-surface-variant)" }}
      >
        통계 로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-5 rounded-2xl text-center"
        style={{ background: "var(--surface-lowest)" }}
      >
        <p className="text-sm" style={{ color: "var(--error)" }}>
          통계를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div
        className="p-5 rounded-2xl text-center"
        style={{ background: "var(--surface-lowest)" }}
      >
        <p className="font-medium mb-1" style={{ color: "var(--on-surface)" }}>
          아직 클릭 데이터가 없습니다
        </p>
        <p className="text-sm" style={{ color: "var(--on-surface-variant)" }}>
          링크를 공유하면 여기서 통계를 확인할 수 있어요.
        </p>
      </div>
    );
  }

  const maxClicks = Math.max(...stats.daily.map((d) => d.clicks), 1);

  return (
    <div
      className="p-5 rounded-2xl"
      style={{ background: "var(--surface-lowest)", boxShadow: "0 2px 48px rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>클릭 통계</h2>
        <span className="text-2xl font-bold tabular-nums">
          {stats.total.toLocaleString()}
          <span className="text-sm font-normal ml-1" style={{ color: "var(--on-surface-variant)" }}>
            전체
          </span>
        </span>
      </div>

      {/* 7일 바 차트 */}
      <div className="flex items-end gap-1.5 h-24 mb-3" role="img" aria-label={`최근 7일 클릭 통계, 총 ${stats.total}회`}>
        {stats.daily.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative" style={{ height: "80px" }}>
              <div
                className="absolute bottom-0 w-full rounded-t transition-all"
                style={{
                  height: `${Math.max((day.clicks / maxClicks) * 100, 4)}%`,
                  background: "var(--primary-container)",
                  opacity: 0.8,
                }}
              />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: "var(--on-surface-variant)" }}>
              {day.date.slice(5)}
            </span>
          </div>
        ))}
      </div>

      {/* 링크별 클릭 */}
      {stats.links.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: "none" }}>
          <h3 className="text-xs font-medium mb-2" style={{ color: "var(--on-surface-variant)" }}>
            링크별 클릭
          </h3>
          <div className="space-y-1.5">
            {stats.links
              .sort((a, b) => b.clicks - a.clicks)
              .map((link) => (
                <div
                  key={link.slug}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-mono truncate" style={{ color: "var(--primary)" }}>
                    {link.slug}
                  </span>
                  <span className="tabular-nums shrink-0 ml-2" style={{ color: "var(--on-surface-variant)" }}>
                    {link.clicks}회
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
