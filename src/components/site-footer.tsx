import { businessInfo } from "@/lib/business-info";

/**
 * 글로벌 footer.
 *
 * `src/app/layout.tsx`에서 한 번만 렌더되어 모든 페이지에 표시됩니다.
 * 사업자 정보는 `businessInfo` 헬퍼에서 가져오며, ENV가 비어 있으면
 * placeholder("등록 진행 중", "—")를 표시해 사이트가 깨지지 않습니다.
 *
 * 전자상거래법은 상호/대표자/사업자등록번호/통신판매업 신고번호/주소/
 * 연락처를 표시하도록 요구하므로 이 footer는 모든 결제 가능 페이지에
 * 노출되어야 합니다.
 */
export function SiteFooter() {
  const phone = businessInfo.phone ? ` · ${businessInfo.phone}` : "";

  return (
    <footer
      className="px-6 sm:px-8 py-10 mt-auto"
      style={{ background: "var(--surface-low)" }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 1) 브랜드 + 정책 링크 */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <a
            href="/"
            className="font-bold tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            좌표.to
          </a>
          <div
            className="flex gap-2 sm:gap-4 text-sm"
            style={{ color: "var(--on-surface-variant)" }}
          >
            <a
              href="/terms"
              className="inline-flex items-center px-3 py-3 -my-1 hover:opacity-70 transition-opacity"
            >
              이용약관
            </a>
            <a
              href="/privacy"
              className="inline-flex items-center px-3 py-3 -my-1 hover:opacity-70 transition-opacity"
            >
              개인정보 처리방침
            </a>
          </div>
        </div>

        {/* 2) 사업자 정보 블록 (전자상거래법 의무) */}
        <div
          className="text-xs leading-relaxed border-t pt-6 space-y-1"
          style={{
            color: "var(--on-surface-variant)",
            borderColor: "var(--outline-variant, rgba(0,0,0,0.08))",
          }}
        >
          <div
            className="font-medium"
            style={{ color: "var(--on-surface)" }}
          >
            {businessInfo.name || "좌표.to"}
          </div>
          <div>
            대표 {businessInfo.representative || "—"} · 사업자등록번호{" "}
            {businessInfo.registrationNumber || "—"}
          </div>
          <div>
            통신판매업 신고{" "}
            {businessInfo.mailOrderNumber || "신고 진행 중"}
          </div>
          <div>{businessInfo.address || "—"}</div>
          <div>
            고객지원 {businessInfo.email}
            {phone}
          </div>
        </div>

        <div
          className="text-xs text-center"
          style={{ color: "var(--on-surface-variant)" }}
        >
          © 2026 좌표.to
        </div>
      </div>
    </footer>
  );
}
