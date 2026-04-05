"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export function AvatarUpload({
  userId,
  currentUrl,
  onUploaded,
}: {
  userId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("파일 크기는 2MB 이하여야 합니다.");
      return;
    }

    setUploading(true);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (error) {
      alert("업로드 실패: " + error.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    // 캐시 버스팅
    const url = publicUrl + "?t=" + Date.now();
    onUploaded(url);
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-4">
      {currentUrl ? (
        <img
          src={currentUrl}
          alt="프로필"
          className="w-16 h-16 rounded-full object-cover border border-[var(--border)]"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-stone-100 border border-[var(--border)] flex items-center justify-center text-[var(--muted)] text-sm">
          사진
        </div>
      )}
      <div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-stone-50 transition disabled:opacity-50"
        >
          {uploading ? "업로드 중..." : "이미지 변경"}
        </button>
        <p className="text-xs text-[var(--muted)] mt-1">2MB 이하, JPG/PNG</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
