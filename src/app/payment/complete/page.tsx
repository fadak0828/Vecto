"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

type PaymentStatus = "checking" | "paid" | "pending" | "error";

export default function PaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex-1 flex items-center justify-center"
          style={{ background: "var(--surface)" }}
        >
          <p style={{ color: "var(--on-surface-variant)" }}>로딩 중...</p>
        </div>
      }
    >
      <PaymentCompleteContent />
    </Suspense>
  );
}

function PaymentCompleteContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const [status, setStatus] = useState<PaymentStatus>("checking");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);

  const checkPaymentStatus = useCallback(async () => {
    if (!paymentId) {
      setStatus("error");
      setError("결제 정보가 없습니다.");
      return;
    }

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

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "var(--surface)" }}>
      <div className="max-w-md w-full mx-auto px-6 text-center">
        {status === "checking" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "var(--primary)", opacity: 0.1 }}>
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "3px solid var(--primary)", borderTopColor: "transparent" }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>결제 확인 중</h1>
            <p style={{ color: "var(--on-surface-variant)" }}>잠시만 기다려주세요...</p>
          </>
        )}

        {status === "pending" && pollCount < 6 && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "var(--primary)", opacity: 0.1 }}>
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "3px solid var(--primary)", borderTopColor: "transparent" }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>결제 처리 중</h1>
            <p style={{ color: "var(--on-surface-variant)" }}>결제가 처리되고 있습니다. 잠시만 기다려주세요...</p>
          </>
        )}

        {status === "pending" && pollCount >= 6 && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center text-2xl" style={{ background: "var(--surface-lowest)" }}>
              ⏳
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>결제 확인이 지연되고 있습니다</h1>
            <p className="mb-6" style={{ color: "var(--on-surface-variant)" }}>
              결제가 완료되었다면 아래 버튼을 눌러 수동으로 확인해주세요.
            </p>
            <button
              onClick={() => {
                setStatus("checking");
                setPollCount(0);
                checkPaymentStatus();
              }}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              결제 확인하기
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
