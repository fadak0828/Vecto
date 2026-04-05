"use client";

import { useEffect, useState } from "react";

type Stats = {
  total: number;
  daily: { date: string; clicks: number }[];
  links: { slug: string; clicks: number }[];
};

export function ClickStats({ namespaceId }: { namespaceId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stats?namespace_id=${namespaceId}`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [namespaceId]);

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
        <h2 className="font-semibold" style={{ fontFamily: "Manrope, sans-serif" }}>클릭 통계</h2>
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
