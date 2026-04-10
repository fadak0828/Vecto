import { redirect } from "next/navigation";
import { getUserNamespaceData } from "@/lib/server/user-namespace";
import { DashboardClient } from "./dashboard-client";

/**
 * 대시보드 서버 컴포넌트.
 *
 * 성능 리팩터 (2026-04-10):
 *   이전 버전은 전체 페이지가 "use client" 였고 브라우저에서 4왕복
 *   (auth → namespaces → slugs → subscriptions) 을 순차 실행했다. 이제는
 *   서버(Vercel edge)에서 한 요청 안에 Promise.all 로 로드하고, 인터랙티브
 *   덩어리만 dashboard-client.tsx 에서 하이드레이트한다.
 *
 *   기대 효과: 500~900ms + 로딩 스피너 → ~100~200ms SSR, 스피너 없음.
 */
export default async function DashboardPage() {
  const data = await getUserNamespaceData();
  if (!data.user) redirect("/auth/login");

  return (
    <DashboardClient
      initialUser={data.user}
      initialNamespace={data.namespace}
      initialLinks={data.links}
      initialSubscription={data.subscription}
    />
  );
}
