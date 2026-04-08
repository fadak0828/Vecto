"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type PaymentStatus = "checking" | "paid" | "pending" | "error";

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={<PaymentLoadingShell label="결제 확인 중" sub="잠시만 기다려주세요..." />}>
      <PaymentCompleteContent />
    </Suspense>
  );
}

/**
 * Visual shell used by the Suspense fallback AND the in-page "checking" /
 * "pending" states. One spinner, one source of truth.
 */
function PaymentLoadingShell({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "var(--surface)" }}>
      <div className="max-w-md w-full mx-auto px-6 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "var(--primary)", opacity: 0.1 }}>
          <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "3px solid var(--primary)", borderTopColor: "transparent" }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>{label}</h1>
        <p style={{ color: "var(--on-surface-variant)" }}>{sub}</p>
      </div>
    </div>
  );
}

function PaymentCompleteContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const [status, setStatus] = useState<PaymentStatus>("checking");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);

  const [checking, setChecking] = useState(false);
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentId) {
      setStatus("error");
      setError("결제 정보가 없습니다.");
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(
        `/api/payment/verify?paymentId=${encodeURIComponent(paymentId)}`,
      );
      const data = await res.json();

      if (data.status === "paid") {
        setStatus("paid");
        // 2초 후 대시보드로 이동
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      } else {
        setStatus("pending");
      }
    } catch {
      setStatus("error");
      setError("결제 확인 중 오류가 발생했습니다.");
    } finally {
      setChecking(false);
    }
  }, [paymentId]);

  // 자동 polling (5초 간격, 최대 6회 = 30초)
  useEffect(() => {
    if (status !== "checking" && status !== "pending") return;
    if (pollCount >= 6) return;

    const timer = setTimeout(() => {
      checkPaymentStatus();
      setPollCount((c) => c + 1);
    }, pollCount === 0 ? 1000 : 5000); // 첫 번째는 1초 후

    return () => clearTimeout(timer);
  }, [status, pollCount, checkPaymentStatus]);

  if (status === "checking") {
    return <PaymentLoadingShell label="결제 확인 중" sub="잠시만 기다려주세요..." />;
  }

  if (status === "pending" && pollCount < 6) {
    // Show progress through the poll loop so the spinner isn't a lie.
    const step = Math.min(pollCount, 5);
    return (
      <PaymentLoadingShell
        label="결제 처리 중"
        sub={`결제가 처리되고 있습니다 (${step}/6) · 최대 30초 소요`}
      />
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "var(--surface)" }}>
      <div className="max-w-md w-full mx-auto px-6 text-center">
        {status === "pending" && pollCount >= 6 && (
          <>
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: "var(--surface-lowest)", color: "var(--on-surface-variant)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>결제 확인이 지연되고 있습니다</h1>
            <p className="mb-6" style={{ color: "var(--on-surface-variant)" }}>
              결제가 완료되었다면 아래 버튼을 눌러 수동으로 확인해주세요.
            </p>
            <button
              onClick={() => {
                if (checking) return;
                setStatus("checking");
                setPollCount(0);
                checkPaymentStatus();
              }}
              disabled={checking}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "var(--primary)" }}
            >
              {checking ? "확인 중…" : "결제 확인하기"}
            </button>
            <a
              href="/dashboard"
              className="block mt-4 text-sm"
              style={{ color: "var(--on-surface-variant)" }}
            >
              대시보드로 돌아가기
            </a>
          </>
        )}

        {status === "paid" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(0,101,101,0.1)" }}>
              ✓
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif", color: "var(--primary)" }}>결제 완료!</h1>
            <p style={{ color: "var(--on-surface-variant)" }}>이용권이 활성화되었습니다. 대시보드로 이동합니다...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(186,26,26,0.1)" }}>
              ✕
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>오류가 발생했습니다</h1>
            <p className="mb-6" style={{ color: "var(--error)" }}>{error}</p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--on-background)" }}
            >
              대시보드로 돌아가기
            </a>
          </>
        )}
      </div>
    </div>
  );
}
