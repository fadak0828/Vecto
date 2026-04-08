import type { Metadata } from "next";
import { businessInfo } from "@/lib/business-info";

export const metadata: Metadata = {
  title: "개인정보 처리방침 — 좌표.to",
  description: "좌표.to 개인정보 처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="flex-1" style={{ background: "var(--surface)" }}>
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-3xl mx-auto">
        <a href="/" className="text-xl font-bold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>좌표.to</a>
      </nav>

      <main className="px-6 sm:px-8 py-8 sm:py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>개인정보 처리방침</h1>
        <p className="text-sm mb-12" style={{ color: "var(--on-surface-variant)" }}>최종 수정일: 2026년 4월 6일</p>

        <div className="space-y-10" style={{ color: "var(--on-surface)", lineHeight: 1.8 }}>
          <Section title="1. 개인정보의 수집 항목 및 수집 방법">
            <p className="mb-3">좌표.to는 서비스 제공을 위해 최소한의 개인정보를 수집합니다.</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--on-surface)" }}>구분</th>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--on-surface)" }}>수집 항목</th>
                  <th className="text-left py-2 font-medium" style={{ color: "var(--on-surface)" }}>수집 방법</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--on-surface-variant)" }}>
                <tr><td className="py-2 pr-4">무료 이용</td><td className="py-2 pr-4">IP 주소</td><td className="py-2">자동 수집</td></tr>
                <tr><td className="py-2 pr-4">네임스페이스 예약</td><td className="py-2 pr-4">이메일 주소, 희망 이름</td><td className="py-2">이용자 입력</td></tr>
                <tr><td className="py-2 pr-4">회원가입</td><td className="py-2 pr-4">이메일 주소</td><td className="py-2">이용자 입력</td></tr>
                <tr><td className="py-2 pr-4">프로필 설정</td><td className="py-2 pr-4">표시 이름, 소개, 프로필 이미지</td><td className="py-2">이용자 입력</td></tr>
                <tr><td className="py-2 pr-4">서비스 이용</td><td className="py-2 pr-4">클릭 로그, 리퍼러 정보</td><td className="py-2">자동 수집</td></tr>
              </tbody>
            </table>
          </Section>

          <Section title="2. 개인정보의 이용 목적">
            <ol className="list-decimal pl-5 space-y-2">
              <li>서비스 제공 및 운영: URL 단축, 네임스페이스 관리, 프로필 페이지 제공</li>
              <li>서비스 보호: 악용 방지를 위한 IP 기반 이용 제한</li>
              <li>통계 분석: 클릭 통계 제공 (이용자 본인의 링크에 한함)</li>
              <li>서비스 개선: 이용 패턴 분석을 통한 서비스 품질 향상</li>
              <li>고객 지원: 문의 대응 및 환불 처리</li>
            </ol>
          </Section>

          <Section title="3. 개인정보의 보유 및 이용 기간">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--on-surface)" }}>항목</th>
                  <th className="text-left py-2 font-medium" style={{ color: "var(--on-surface)" }}>보유 기간</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--on-surface-variant)" }}>
                <tr><td className="py-2 pr-4">무료 URL 관련 IP</td><td className="py-2">URL 만료 후 30일</td></tr>
                <tr><td className="py-2 pr-4">회원 정보 (이메일)</td><td className="py-2">회원 탈퇴 시까지</td></tr>
                <tr><td className="py-2 pr-4">클릭 로그</td><td className="py-2">수집일로부터 1년</td></tr>
                <tr><td className="py-2 pr-4">네임스페이스 예약 정보</td><td className="py-2">예약 후 6개월 (미전환 시 삭제)</td></tr>
              </tbody>
            </table>
          </Section>

          <Section title="4. 제3자로부터 수집하는 개인정보">
            <p className="mb-3">
              Google OAuth 로그인을 통해 회원가입 또는 로그인 시, 좌표.to는 Google로부터 다음 정보를 제공받습니다.
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--on-surface)" }}>제공자</th>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--on-surface)" }}>제공 항목</th>
                  <th className="text-left py-2 font-medium" style={{ color: "var(--on-surface)" }}>이용 목적</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--on-surface-variant)" }}>
                <tr>
                  <td className="py-2 pr-4">Google LLC</td>
                  <td className="py-2 pr-4">이메일 주소, 이름, 프로필 이미지 URL</td>
                  <td className="py-2">회원 식별, 갱신 알림 발송, 프로필 표시</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs" style={{ color: "var(--on-surface-variant)" }}>
              이용자는 Google 로그인 버튼을 클릭함으로써 위 정보의 수집·이용에 동의한 것으로 간주됩니다.
            </p>
          </Section>

          <Section title="5. 개인정보의 제3자 제공">
            좌표.to는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 다음의 경우는 예외로 합니다.
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 의거하거나 수사기관의 요청이 있는 경우</li>
            </ol>
          </Section>

          <Section title="6. 개인정보의 위탁">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--on-surface)" }}>수탁업체</th>
                  <th className="text-left py-2 pr-4 font-medium" style={{ color: "var(--on-surface)" }}>위탁 업무</th>
                  <th className="text-left py-2 font-medium" style={{ color: "var(--on-surface)" }}>보유 기간</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--on-surface-variant)" }}>
                <tr><td className="py-2 pr-4">Supabase Inc.</td><td className="py-2 pr-4">데이터베이스 호스팅, 인증, 파일 저장</td><td className="py-2">서비스 이용 기간</td></tr>
                <tr><td className="py-2 pr-4">Vercel Inc.</td><td className="py-2 pr-4">웹 애플리케이션 호스팅</td><td className="py-2">서비스 이용 기간</td></tr>
              </tbody>
            </table>
          </Section>

          <Section title="7. 이용자의 권리">
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>개인정보 열람, 수정, 삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
              <li>회원 탈퇴 (대시보드 또는 이메일 요청)</li>
            </ol>
            <p className="mt-2">요청은 {businessInfo.email}로 접수하시면 10일 이내에 처리합니다.</p>
          </Section>

          <Section title="8. 개인정보의 안전성 확보 조치">
            <ol className="list-decimal pl-5 space-y-2">
              <li>데이터 전송 시 TLS/SSL 암호화 적용</li>
              <li>데이터베이스 접근 제한 (Row Level Security)</li>
              <li>비밀번호 미저장 (Google OAuth 방식 인증)</li>
              <li>정기적 보안 점검 실시</li>
            </ol>
          </Section>

          <Section title="9. 쿠키의 사용">
            좌표.to는 인증 세션 유지를 위해 쿠키를 사용합니다. 이용자는 브라우저 설정에서 쿠키를 거부할 수 있으나, 이 경우 로그인이 필요한 서비스 이용이 제한됩니다.
          </Section>

          <Section title="10. 개인정보 보호 책임자">
            <p>개인정보 보호 관련 문의는 아래로 연락해 주시기 바랍니다.</p>
            <ul className="mt-2 space-y-1">
              <li>책임자: {businessInfo.representative || "등록 진행 중"} (대표)</li>
              <li>이메일: {businessInfo.email}</li>
            </ul>
          </Section>

          <Section title="11. 방침 변경">
            본 개인정보 처리방침이 변경될 경우, 변경 사항을 서비스 내 공지사항을 통해 안내하며, 변경된 방침은 게시한 날로부터 7일 후 시행됩니다.
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "Manrope, sans-serif" }}>{title}</h2>
      <div className="text-sm" style={{ color: "var(--on-surface-variant)" }}>{children}</div>
    </section>
  );
}
