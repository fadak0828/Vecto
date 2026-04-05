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
      <div className="p-5 bg-[var(--surface)] rounded-2xl border border-[var(--border)] text-center text-[var(--muted)] text-sm">
        통계 로딩 중...
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="p-5 bg-[var(--surface)] rounded-2xl border border-[var(--border)] text-center">
        <div className="text-3xl mb-2">📊</div>
        <p className="text-[var(--muted)] text-sm">
          아직 클릭 데이터가 없습니다. 링크를 공유해보세요.
        </p>
      </div>
    );
  }

  const maxClicks = Math.max(...stats.daily.map((d) => d.clicks), 1);

  return (
    <div className="p-5 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">클릭 통계</h2>
        <span className="text-2xl font-bold tabular-nums">
          {stats.total.toLocaleString()}
          <span className="text-sm font-normal text-[var(--muted)] ml-1">
            전체
          </span>
        </span>
      </div>

      {/* 7일 바 차트 */}
      <div className="flex items-end gap-1.5 h-24 mb-3">
        {stats.daily.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative" style={{ height: "80px" }}>
              <div
                className="absolute bottom-0 w-full rounded-t bg-[var(--accent)] opacity-80 transition-all"
                style={{
                  height: `${Math.max((day.clicks / maxClicks) * 100, 4)}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-[var(--muted)] tabular-nums">
              {day.date.slice(5)}
            </span>
          </div>
        ))}
      </div>

      {/* 링크별 클릭 */}
      {stats.links.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <h3 className="text-xs font-medium text-[var(--muted)] mb-2">
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
                  <span className="font-mono text-[var(--accent)] truncate">
                    {link.slug}
                  </span>
                  <span className="text-[var(--muted)] tabular-nums shrink-0 ml-2">
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
