"use client";

/**
 * 결제 상태 표시 컴포넌트.
 * Dashboard에서 사용.
 */
export function PaymentStatus({
  paymentStatus,
  paidUntil,
}: {
  paymentStatus: string;
  paidUntil: string | null;
}) {
  if (paymentStatus === "free") {
    return (
      <div
        className="p-4 rounded-xl flex items-center justify-between"
        style={{ background: "var(--surface-low)" }}
      >
        <div>
          <span className="text-sm font-medium">무료 플랜</span>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--on-surface-variant)" }}
          >
            프리미엄으로 업그레이드하여 전용 주소를 확보하세요.
          </p>
        </div>
        <a
          href="/pricing"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
          style={{ background: "var(--primary)" }}
        >
          업그레이드
        </a>
      </div>
    );
  }

  if (paymentStatus === "expired") {
    return (
      <div
        className="p-4 rounded-xl flex items-center justify-between"
        style={{ background: "rgba(186,26,26,0.06)" }}
      >
        <div>
          <span className="text-sm font-medium" style={{ color: "var(--error)" }}>
            이용권 만료
          </span>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {paidUntil
              ? `${new Date(paidUntil).toLocaleDateString("ko-KR")}에 만료됨`
              : "이용권이 만료되었습니다."}
            {" · "}30일 이내 갱신하지 않으면 리다이렉트가 중지됩니다.
          </p>
        </div>
        <a
          href="/pricing"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
          style={{ background: "var(--error)" }}
        >
          갱신하기
        </a>
      </div>
    );
  }

  // active
  const daysLeft = paidUntil
    ? Math.ceil(
        (new Date(paidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 14;

  return (
    <div
      className="p-4 rounded-xl flex items-center justify-between"
      style={{
        background: isExpiringSoon
          ? "rgba(186,26,26,0.04)"
          : "rgba(0,101,101,0.04)",
      }}
    >
      <div>
        <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          프리미엄 활성
        </span>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--on-surface-variant)" }}
        >
          {paidUntil
            ? `${new Date(paidUntil).toLocaleDateString("ko-KR")}까지 이용 가능`
            : ""}
          {isExpiringSoon && ` · ${daysLeft}일 남음`}
        </p>
      </div>
      {isExpiringSoon && (
        <a
          href="/pricing"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shrink-0"
          style={{ background: "var(--primary)" }}
        >
          연장하기
        </a>
      )}
    </div>
  );
}
