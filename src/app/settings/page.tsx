import { redirect } from "next/navigation";
import { getUserNamespaceData } from "@/lib/server/user-namespace";
import { SettingsClient } from "./settings-client";

/**
 * 설정 서버 컴포넌트.
 *
 * 성능 리팩터 (2026-04-10): 대시보드와 동일하게 서버에서 데이터를 로드하고
 * 인터랙티브 부분만 settings-client.tsx 에서 하이드레이트. React.cache 덕분에
 * 대시보드 ↔ 설정 이동 시에도 같은 요청 스코프 안에서는 중복 쿼리 없음.
 */
export default async function SettingsPage() {
  const data = await getUserNamespaceData();
  if (!data.user) redirect("/auth/login");

  return (
    <SettingsClient
      initialUser={data.user}
      initialNamespace={data.namespace}
      initialLinks={data.links}
    />
  );
}
