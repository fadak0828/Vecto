import { cache } from "react";
import { createClient } from "@/lib/supabase-server";

/**
 * 대시보드/설정에서 공유하는 "현재 사용자 + 네임스페이스 + 서브링크 + 구독" 로더.
 *
 * - Server Component 에서만 호출 (createClient 가 next/headers 의 cookies 사용).
 * - React.cache 로 감싸서 같은 요청 내 1회만 실행 → 대시보드와 설정이
 *   같은 요청 안에서 호출해도 DB 왕복 중복 없음.
 * - namespaces → Promise.all([slugs, subscription]) 로 왕복 최소화.
 *
 * 반환값은 "미인증", "네임스페이스 없음" 케이스도 분리해서 내려서
 * 호출부가 분기 처리할 수 있도록 함.
 */

export type ServerNamespace = {
  id: string;
  name: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  payment_status: string;
  paid_until: string | null;
};

export type ServerSubLink = {
  id: string;
  slug: string;
  target_url: string;
  click_count: number;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_site_name: string | null;
  og_fetch_error: string | null;
};

export type ServerSubscription = {
  id: string;
  status:
    | "pending"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "failed";
  current_period_end: string | null;
  past_due_since: string | null;
  failed_charge_count: number;
};

export type UserNamespaceData = {
  user: { id: string; email: string } | null;
  namespace: ServerNamespace | null;
  links: ServerSubLink[];
  subscription: ServerSubscription | null;
};

export const getUserNamespaceData = cache(
  async (): Promise<UserNamespaceData> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { user: null, namespace: null, links: [], subscription: null };
    }

    const { data: ns } = await supabase
      .from("namespaces")
      .select(
        "id, name, display_name, bio, avatar_url, payment_status, paid_until",
      )
      .eq("owner_id", user.id)
      .maybeSingle<ServerNamespace>();

    if (!ns) {
      return {
        user: { id: user.id, email: user.email ?? "" },
        namespace: null,
        links: [],
        subscription: null,
      };
    }

    const [slugsRes, subRes] = await Promise.all([
      supabase
        .from("slugs")
        .select(
          "id, slug, target_url, click_count, og_title, og_description, og_image, og_site_name, og_fetch_error",
        )
        .eq("namespace_id", ns.id)
        .order("created_at", { ascending: true })
        .returns<ServerSubLink[]>(),
      supabase
        .from("subscriptions_public")
        .select(
          "id, status, current_period_end, past_due_since, failed_charge_count",
        )
        .eq("namespace_id", ns.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<ServerSubscription>(),
    ]);

    return {
      user: { id: user.id, email: user.email ?? "" },
      namespace: ns,
      links: slugsRes.data ?? [],
      subscription: subRes.data ?? null,
    };
  },
);
