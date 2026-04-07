import type { Metadata } from "next";
import { businessInfo } from "@/lib/business-info";

export const metadata: Metadata = {
  title: "이용약관 — 좌표.to",
  description: "좌표.to 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="flex-1" style={{ background: "var(--surface)" }}>
      <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-3xl mx-auto">
        <a href="/" className="text-xl font-bold tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>좌표.to</a>
      </nav>

      <main className="px-6 sm:px-8 py-8 sm:py-16 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>이용약관</h1>
        <p className="text-sm mb-12" style={{ color: "var(--on-surface-variant)" }}>최종 수정일: 2026년 4월 6일</p>

        <div className="space-y-10" style={{ color: "var(--on-surface)", lineHeight: 1.8 }}>
          <Section title="제1조 (목적)">
            본 약관은 좌표.to(이하 &ldquo;서비스&rdquo;)가 제공하는 URL 단축 및 개인 네임스페이스 서비스의 이용 조건과 절차, 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </Section>

          <Section title="제2조 (정의)">
            <ol className="list-decimal pl-5 space-y-2">
              <li>&ldquo;서비스&rdquo;란 좌표.to가 제공하는 한글 URL 단축, 개인 네임스페이스, 프로필 페이지 및 관련 부가 기능을 말합니다.</li>
              <li>&ldquo;이용자&rdquo;란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
              <li>&ldquo;네임스페이스&rdquo;란 이용자에게 부여되는 고유한 URL 경로(예: 좌표.to/이름)를 말합니다.</li>
              <li>&ldquo;무료 URL&rdquo;이란 회원가입 없이 생성 가능한 임시 단축 URL(7일 유효)을 말합니다.</li>
            </ol>
          </Section>

          <Section title="제3조 (약관의 효력 및 변경)">
            <ol className="list-decimal pl-5 space-y-2">
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일 7일 전에 공지합니다.</li>
            </ol>
          </Section>

          <Section title="제4조 (서비스의 제공)">
            <ol className="list-decimal pl-5 space-y-2">
              <li>무료 URL 단축 서비스: 회원가입 없이 이용 가능. IP당 일일 10개, 월 30개 제한. 생성 후 7일간 유효.</li>
              <li>프리미엄 네임스페이스: 회원가입 및 결제 후 이용 가능. 구독 기간 동안 유지되는 전용 주소, 무제한 하위 링크, 프로필 페이지 포함.</li>
              <li>서비스는 연중무휴 제공을 원칙으로 하나, 시스템 점검 등 불가피한 경우 일시 중단할 수 있습니다.</li>
            </ol>
          </Section>

          <Section title="제5조 (이용자의 의무)">
            <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>피싱, 사기, 악성코드 배포 등 불법적인 목적의 URL 생성</li>
              <li>타인의 명예를 훼손하거나 권리를 침해하는 콘텐츠로의 연결</li>
              <li>서비스의 안정적 운영을 방해하는 행위 (대량 자동 생성 등)</li>
              <li>타인의 네임스페이스를 사칭하거나 혼동을 유발하는 행위</li>
              <li>관련 법령에 위반되는 행위</li>
            </ol>
          </Section>

          <Section title="제6조 (서비스 이용 제한)">
            회사는 이용자가 제5조의 의무를 위반한 경우, 사전 통지 없이 해당 URL을 삭제하거나 서비스 이용을 제한할 수 있습니다. 이용 제한에 대해 이의가 있는 경우 support@좌표.to로 문의할 수 있습니다.
          </Section>

          <Section title="제7조 (면책)">
            <ol className="list-decimal pl-5 space-y-2">
              <li>회사는 이용자가 생성한 URL의 연결 대상 콘텐츠에 대해 책임을 지지 않습니다.</li>
              <li>천재지변, 기간통신사업자의 서비스 중단 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>무료 URL의 만료 또는 삭제로 인한 손해에 대해 책임을 지지 않습니다.</li>
            </ol>
          </Section>

          <Section title="제8조 (환불)">
            프리미엄 서비스 결제 후 7일 이내에 서비스를 이용하지 않은 경우 전액 환불이 가능합니다. 환불 요청은 support@좌표.to로 접수하시기 바랍니다.
          </Section>

          <Section title="제9조 (분쟁 해결)">
            본 약관과 관련된 분쟁은 대한민국 법률에 따르며, 관할 법원은 민사소송법에서 정한 관할 법원으로 합니다.
          </Section>

          <Section title="제10조 (사업자 정보)">
            <ul className="space-y-1">
              <li>상호: {businessInfo.name || "좌표.to"}</li>
              <li>대표자: {businessInfo.representative || "등록 진행 중"}</li>
              <li>사업자등록번호: {businessInfo.registrationNumber || "등록 진행 중"}</li>
              <li>통신판매업 신고번호: {businessInfo.mailOrderNumber || "신고 진행 중"}</li>
              <li>사업장 주소: {businessInfo.address || "등록 진행 중"}</li>
              <li>이메일: {businessInfo.email}</li>
              {businessInfo.phone && <li>전화: {businessInfo.phone}</li>}
            </ul>
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
