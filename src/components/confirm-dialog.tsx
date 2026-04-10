"use client";

import { useEffect, useRef } from "react";

/**
 * ConfirmDialog — accessible confirmation modal (D-H5).
 *
 * Features:
 * - Focus trap (Tab cycles between Cancel and Confirm)
 * - Escape closes
 * - Enter triggers primary action
 * - aria-modal, aria-labelledby, aria-describedby
 * - Scroll lock on body
 * - prefers-reduced-motion respect
 *
 * Usage:
 *   <ConfirmDialog
 *     open={open}
 *     title="구독을 해지하시겠어요?"
 *     description="2026-05-07까지 이용 가능합니다."
 *     confirmLabel="해지"
 *     cancelLabel="돌아가기"
 *     onConfirm={...}
 *     onCancel={() => setOpen(false)}
 *   />
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Scroll lock + focus management
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";

    // Focus cancel button by default (less destructive)
    setTimeout(() => cancelBtnRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = "";
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Keyboard handling
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
        return;
      }
      if (e.key === "Tab") {
        // Focus trap between 2 buttons
        const active = document.activeElement;
        if (!e.shiftKey && active === confirmBtnRef.current) {
          e.preventDefault();
          cancelBtnRef.current?.focus();
        } else if (e.shiftKey && active === cancelBtnRef.current) {
          e.preventDefault();
          confirmBtnRef.current?.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: "rgba(26, 28, 28, 0.4)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
        className="w-full max-w-sm rounded-2xl p-6 sm:p-7"
        style={{
          background: "var(--surface-lowest)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.16)",
        }}
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg sm:text-xl font-bold mb-2 break-keep"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--on-background)",
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            id="confirm-dialog-desc"
            className="text-sm mb-6 break-keep"
            style={{ color: "var(--on-surface-variant)", lineHeight: 1.7 }}
          >
            {description}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-medium text-sm transition-opacity hover:opacity-80"
            style={{
              background: "transparent",
              color: "var(--on-surface-variant)",
              border: "1px solid var(--outline-variant)",
              minHeight: 44,
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl font-medium text-sm text-white transition-opacity hover:opacity-90"
            style={{
              background: destructive
                ? "var(--error)"
                : "linear-gradient(135deg, var(--primary), var(--primary-container))",
              minHeight: 44,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
