"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { AvatarUpload } from "@/components/avatar-upload";
import { ClickStats } from "@/components/click-stats";
import { PaymentStatus } from "@/components/payment-status";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ClickChartPreview,
  NamespacePillPreview,
  ProfileCardPreview,
} from "@/components/premium-previews";
import { validateSlug, validateUrl } from "@/lib/slug-validation";
import { SublinkDetailModal } from "@/components/sublink-detail-modal";
import type {
  ServerNamespace,
  ServerSubLink,
  ServerSubscription,
} from "@/lib/server/user-namespace";

type Props = {
  initialUser: { id: string; email: string };
  initialNamespace: ServerNamespace | null;
  initialLinks: ServerSubLink[];
  initialSubscription: ServerSubscription | null;
};

export function DashboardClient({
  initialUser,
  initialNamespace,
  initialLinks,
  initialSubscription,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [user] = useState(initialUser);
  const [namespace, setNamespace] = useState<ServerNamespace | null>(
    initialNamespace,
  );
  const [subscription, setSubscription] = useState<ServerSubscription | null>(
    initialSubscription,
  );
  const [links, setLinks] = useState<ServerSubLink[]>(initialLinks);

  // 서버가 새 데이터를 내려주면 (router.refresh 이후) 로컬 state 동기화.
  useEffect(() => {
    setNamespace(initialNamespace);
  }, [initialNamespace]);
  useEffect(() => {
    setSubscription(initialSubscription);
  }, [initialSubscription]);
  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [claimName, setClaimName] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(
    initialNamespace?.display_name ?? "",
  );
  const [bio, setBio] = useState(initialNamespace?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(
    initialNamespace?.avatar_url ?? "",
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailLink, setDetailLink] = useState<ServerSubLink | null>(null);

  // initialNamespace 가 바뀌면 편집 폼 필드도 리셋.
  useEffect(() => {
    setDisplayName(initialNamespace?.display_name ?? "");
    setBio(initialNamespace?.bio ?? "");
    setAvatarUrl(initialNamespace?.avatar_url ?? "");
  }, [initialNamespace]);

  // 자동 사라지는 메시지
  const showMsg = useCallback(
    (
      setter: (
        v: { type: "success" | "error"; text: string } | null,
      ) => void,
      type: "success" | "error",
      text: string,
    ) => {
      setter({ type, text });
      setTimeout(() => setter(null), 3000);
    },
    [],
  );

  async function handleCancelSubscription() {
    if (!subscription) return;
    setCanceling(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_id: subscription.id }),
      });
      if (res.ok) {
        setCancelOpen(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "해지 처리 중 오류가 발생했습니다.");
      }
    } catch {
      alert("해지 처리 중 오류가 발생했습니다.");
    } finally {
      setCanceling(false);
    }
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setClaiming(true);
    setClaimError("");
    const check = validateSlug(claimName);
    if (!check.valid) {
      setClaimError(check.error!);
      setClaiming(false);
      return;
    }
    const { error } = await supabase
      .from("namespaces")
      .insert({ name: claimName, owner_id: user.id })
      .select(
        "id, name, display_name, bio, avatar_url, payment_status, paid_until",
      )
      .single();
    if (error) {
      if (error.code === "23505") {
        setClaimError("이미 사용 중인 이름입니다.");
      } else {
        setClaimError("생성 실패: " + error.message);
      }
    } else {
      // 서버가 새 namespace 를 다음 렌더에 돌려줌.
      router.refresh();
    }
    setClaiming(false);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!namespace) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("namespaces")
      .update({
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      })
      .eq("id", namespace.id);
    if (error) {
      showMsg(
        setProfileMsg,
        "error",
        "저장에 실패했습니다: " + error.message,
      );
    } else {
      // 낙관적: 로컬 state 즉시 업데이트
      setNamespace({
        ...namespace,
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      });
      setEditingProfile(false);
      showMsg(setProfileMsg, "success", "프로필이 저장되었습니다.");
      // 서버 동기화
      router.refresh();
    }
    setSavingProfile(false);
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!namespace) return;
    setAdding(true);
    setAddError("");
    const slugCheck = validateSlug(newSlug);
    if (!slugCheck.valid) {
      setAddError(slugCheck.error!);
      setAdding(false);
      return;
    }
    const urlCheck = validateUrl(newUrl);
    if (!urlCheck.valid) {
      setAddError(urlCheck.error!);
      setAdding(false);
      return;
    }
    try {
      const res = await fetch("/api/slugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug,
          target_url: newUrl,
          namespace_id: namespace.id,
        }),
      });
      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: "추가 실패" }));
        setAddError(data.error ?? "추가 실패");
      } else {
        const inserted = (await res.json()) as ServerSubLink;
        // 낙관적: OG 필드가 비어있는 채로 즉시 리스트에 추가.
        setLinks((prev) => [...prev, inserted]);
        setNewSlug("");
        setNewUrl("");
        // 서버에서 OG 가 채워진 뒤의 state 를 가져오기 위해 2초 후 refresh.
        // (after() 백그라운드 fetch 가 보통 1초 이내 완료)
        router.refresh();
        setTimeout(() => router.refresh(), 2000);
      }
    } catch {
      setAddError("추가 실패: 네트워크 오류");
    }
    setAdding(false);
  }

  async function handleDeleteLink(id: string) {
    // 2-step: 첫 클릭은 확인 요청, 두번째 클릭은 실제 삭제
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(
        () => setDeletingId((prev) => (prev === id ? null : prev)),
        3000,
      );
      return;
    }
    const prevLinks = [...links];
    setLinks(links.filter((l) => l.id !== id));
    setDeletingId(null);
    try {
      const res = await fetch(`/api/slugs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setLinks(prevLinks);
        setAddError("삭제에 실패했습니다. 다시 시도해주세요.");
        setTimeout(() => setAddError(""), 3000);
      } else {
        router.refresh();
      }
    } catch {
      setLinks(prevLinks);
      setAddError("삭제에 실패했습니다. 다시 시도해주세요.");
      setTimeout(() => setAddError(""), 3000);
    }
  }

  async function handleRefreshOG(id: string) {
    try {
      const res = await fetch(`/api/slugs/${id}/refresh-og`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setLinks((prev) =>
          prev.map((l) => (l.id === id ? { ...l, ...updated } : l)),
        );
        setDetailLink((prev) =>
          prev && prev.id === id ? { ...prev, ...updated } : prev,
        );
        router.refresh();
      }
    } catch {
      // silent — 모달이 에러 상태를 그대로 둠
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="flex-1" style={{ background: "var(--surface)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-5xl mx-auto">
        <a
          href="/"
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-manrope), sans-serif" }}
        >
          좌표.to
        </a>
        <div className="flex items-center gap-4">
          <a
            href="/settings"
            className="text-sm hover:opacity-70 transition-opacity hidden sm:inline-flex"
            style={{ color: "var(--on-surface-variant)" }}
          >
            설정
          </a>
          <span
            className="text-sm hidden sm:inline-flex sm:items-center"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm hover:opacity-70"
            style={{ color: "var(--on-surface-variant)" }}
          >
            로그아웃
          </button>
        </div>
      </nav>

      <main className="px-6 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
        {!namespace ? (
          /* Claim — 무료 가입 = 즉시 namespace 소유 (v0.7.0 freemium) */
          <section className="max-w-lg">
            <h1
              className="text-4xl font-extrabold mb-2"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              내 좌표 만들기
            </h1>
            <p
              className="mb-6 break-keep"
              style={{ color: "var(--on-surface-variant)" }}
            >
              좌표.to/내이름 으로 나만의 전용 주소를 무료로 만드세요.
            </p>

            <div className="mb-6">
              <NamespacePillPreview slug={claimName || "내이름"} />
            </div>

            <form onSubmit={handleClaim} className="space-y-3">
              <div
                className="flex items-center rounded-xl overflow-hidden"
                style={{
                  background: "var(--surface-lowest)",
                  boxShadow: "0 2px 32px rgba(0,0,0,0.03)",
                }}
              >
                <span
                  className="pl-4 pr-1 py-3 text-sm whitespace-nowrap"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  좌표.to/
                </span>
                <input
                  type="text"
                  value={claimName}
                  onChange={(e) =>
                    setClaimName(e.target.value.replace(/\s+/g, "-"))
                  }
                  placeholder="내이름"
                  className="flex-1 py-3 pr-4 bg-transparent outline-none text-lg"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={claiming}
                className="w-full py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{
                  background: "var(--on-background)",
                  color: "var(--surface-lowest)",
                }}
              >
                {claiming ? "생성 중..." : "무료로 시작하기"}
              </button>
              {claimError && (
                <p className="text-sm" style={{ color: "var(--error)" }}>
                  {claimError}
                </p>
              )}
              <p
                className="text-xs text-center break-keep"
                style={{ color: "var(--on-surface-variant)" }}
              >
                전 기능 무제한 무료. 카드 등록 없음.
              </p>
            </form>

            <div className="mt-10">
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "var(--primary)" }}
              >
                프리미엄으로 받는 것
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ProfileCardPreview displayName={claimName || "내이름"} />
                <ClickChartPreview />
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <div>
              <h1
                className="text-3xl font-extrabold"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                대시보드
              </h1>
              <p style={{ color: "var(--on-surface-variant)" }}>
                당신만의 디지털 좌표를 관리하세요.
              </p>
            </div>

            <PaymentStatus
              subscription={subscription}
              namespaceSlug={namespace.name}
              displayName={namespace.display_name ?? undefined}
              onCancel={
                subscription?.status === "active"
                  ? () => setCancelOpen(true)
                  : undefined
              }
            />

            <ClickStats
              namespaceId={namespace.id}
              isPaid={
                subscription?.status === "active" ||
                subscription?.status === "canceled"
              }
            />

            {/* Profile card */}
            <div
              className="p-6 rounded-2xl"
              style={{
                background: "var(--surface-lowest)",
                boxShadow: "0 2px 48px rgba(0,0,0,0.03)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {namespace.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={namespace.avatar_url}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
                      style={{ background: "var(--primary)" }}
                    >
                      {(namespace.display_name || namespace.name)[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2
                      className="text-lg font-bold"
                      style={{
                        fontFamily: "var(--font-manrope), sans-serif",
                      }}
                    >
                      {namespace.display_name || namespace.name}
                    </h2>
                    <p
                      className="text-sm font-mono"
                      style={{ color: "var(--primary)" }}
                    >
                      좌표.to/{namespace.name}
                    </p>
                    {namespace.bio && (
                      <p
                        className="text-sm mt-1"
                        style={{ color: "var(--on-surface-variant)" }}
                      >
                        {namespace.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/${namespace.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-xs rounded-full"
                    style={{
                      background: "var(--secondary-container)",
                      color: "var(--on-surface)",
                    }}
                  >
                    프로필 보기
                  </a>
                  <button
                    onClick={() => setEditingProfile(!editingProfile)}
                    className="px-3 py-2 text-xs rounded-full"
                    style={{
                      background: "var(--secondary-container)",
                      color: "var(--on-surface)",
                    }}
                  >
                    {editingProfile ? "취소" : "편집"}
                  </button>
                </div>
              </div>

              {profileMsg && (
                <p
                  className="mt-3 text-sm"
                  style={{
                    color:
                      profileMsg.type === "error"
                        ? "var(--error)"
                        : "var(--primary)",
                  }}
                >
                  {profileMsg.text}
                </p>
              )}

              {editingProfile && (
                <form
                  onSubmit={handleSaveProfile}
                  className="mt-6 pt-6 space-y-3"
                  style={{
                    background: "var(--surface-low)",
                    margin: "24px -24px -24px",
                    padding: "24px",
                    borderRadius: "0 0 16px 16px",
                  }}
                >
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      프로필 이미지
                    </label>
                    <AvatarUpload
                      userId={user.id}
                      currentUrl={avatarUrl || null}
                      onUploaded={(url) => setAvatarUrl(url)}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      표시 이름
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={namespace.name}
                      className="w-full py-2.5 px-3 rounded-xl outline-none text-sm"
                      style={{ background: "var(--surface-lowest)" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: "var(--on-surface-variant)" }}
                    >
                      한줄 소개
                    </label>
                    <input
                      type="text"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="AI 기업강의 전문 강사"
                      maxLength={200}
                      className="w-full py-2.5 px-3 rounded-xl outline-none text-sm"
                      style={{ background: "var(--surface-lowest)" }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    style={{ background: "var(--primary)" }}
                  >
                    {savingProfile ? "저장 중..." : "프로필 저장"}
                  </button>
                </form>
              )}
            </div>

            {/* Links */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="font-bold"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  좌표 및 링크 관리
                </h2>
                <span
                  className="text-sm"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  {links.length}개
                </span>
              </div>

              {links.length === 0 ? (
                <div
                  className="py-10 text-center rounded-2xl"
                  style={{ background: "var(--surface-lowest)" }}
                >
                  <p className="font-medium mb-1">아직 링크가 없습니다</p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    아래에서 첫 번째 링크를 추가하세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-3 p-4 rounded-xl transition-all hover:translate-x-0.5"
                      style={{ background: "var(--surface-lowest)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-mono text-sm truncate"
                          style={{ color: "var(--primary)" }}
                        >
                          좌표.to/{namespace.name}/{link.slug}
                        </div>
                        <div
                          className="text-sm truncate"
                          style={{ color: "var(--on-surface-variant)" }}
                        >
                          → {link.target_url}
                        </div>
                      </div>
                      <span
                        className="text-xs tabular-nums shrink-0"
                        style={{ color: "var(--on-surface-variant)" }}
                      >
                        {link.click_count.toLocaleString()}회
                      </span>
                      <button
                        onClick={() => setDetailLink(link)}
                        className="text-xs px-2 py-1 rounded-lg hover:opacity-70 shrink-0 transition-colors"
                        style={{ color: "var(--on-surface-variant)" }}
                        aria-label={`${link.slug} 자세히 보기`}
                      >
                        자세히
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="text-xs px-2 py-1 rounded-lg hover:opacity-70 shrink-0 transition-colors"
                        style={{
                          color:
                            deletingId === link.id
                              ? "var(--surface-lowest)"
                              : "var(--error)",
                          background:
                            deletingId === link.id
                              ? "var(--error)"
                              : "transparent",
                        }}
                      >
                        {deletingId === link.id ? "정말 삭제?" : "삭제"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add link */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "var(--surface-lowest)",
                boxShadow: "0 2px 48px rgba(0,0,0,0.03)",
              }}
            >
              <h2
                className="font-bold mb-3"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                새 링크 추가
              </h2>
              <form onSubmit={handleAddLink} className="space-y-3">
                <div
                  className="flex items-center rounded-xl overflow-hidden"
                  style={{ background: "var(--surface-low)" }}
                >
                  <span
                    className="pl-4 pr-1 py-2.5 text-sm whitespace-nowrap"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    /{namespace.name}/
                  </span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) =>
                      setNewSlug(e.target.value.replace(/\s+/g, "-"))
                    }
                    placeholder="노션"
                    className="flex-1 py-2.5 pr-4 bg-transparent outline-none"
                    required
                  />
                </div>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="연결할 URL (https://...)"
                  className="w-full py-2.5 px-4 rounded-xl outline-none"
                  style={{ background: "var(--surface-low)" }}
                  required
                />
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  style={{ background: "var(--primary)" }}
                >
                  {adding ? "추가 중..." : "+ 새 링크 추가"}
                </button>
                {addError && (
                  <p className="text-sm" style={{ color: "var(--error)" }}>
                    {addError}
                  </p>
                )}
              </form>
            </div>
          </section>
        )}
      </main>

      {/* Sublink detail modal — QR, full URL, copy, OG preview, refresh */}
      {detailLink && namespace && (
        <SublinkDetailModal
          open={detailLink !== null}
          onClose={() => setDetailLink(null)}
          link={detailLink}
          namespaceName={namespace.name}
          onRefreshOG={handleRefreshOG}
        />
      )}

      {/* Cancel confirmation dialog */}
      {subscription && (
        <ConfirmDialog
          open={cancelOpen}
          title="구독을 해지하시겠어요?"
          description={
            subscription.current_period_end
              ? `${new Date(
                  subscription.current_period_end,
                ).toLocaleDateString("ko-KR")}까지는 프리미엄을 계속 이용할 수 있어요. 그 이후에는 프로필 페이지에 안내 1줄이 다시 표시됩니다.`
              : "해지하시면 프로필 페이지에 안내 1줄이 다시 표시됩니다."
          }
          confirmLabel={canceling ? "처리 중..." : "해지"}
          cancelLabel="돌아가기"
          destructive
          onConfirm={handleCancelSubscription}
          onCancel={() => setCancelOpen(false)}
        />
      )}
    </div>
  );
}
