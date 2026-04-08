// /auth/login Phase 1a 동작 테스트
//
// jsdom + vitest 4 호환 문제로 React 렌더링은 피하고,
// 프로젝트 기존 패턴(pure function 추출 + route handler import)에 맞춰
// 다음을 검증한다:
//   - URL ?error= 파라미터 → 한국어 메시지 매핑 (mapLoginErrorParam)
//   - 라우트 파일이 server component 패턴을 따르고 있는지 정적 검사
//   - GoogleSignInButton 이 올바른 OAuth 인자를 사용하는지 정적 검사
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LOGIN_CANCELLED_MESSAGE,
  LOGIN_FAILED_MESSAGE,
  mapLoginErrorParam,
} from "../src/app/auth/login/_components/GoogleSignInButton";

describe("mapLoginErrorParam — URL ?error= 한국어 매핑", () => {
  it("auth_failed → 실패 메시지", () => {
    expect(mapLoginErrorParam("auth_failed")).toBe(LOGIN_FAILED_MESSAGE);
    expect(mapLoginErrorParam("auth_failed")).toContain("실패");
  });

  it("access_denied → 취소 메시지 (사용자가 Google consent 취소)", () => {
    expect(mapLoginErrorParam("access_denied")).toBe(LOGIN_CANCELLED_MESSAGE);
    expect(mapLoginErrorParam("access_denied")).toContain("취소");
  });

  it("undefined 또는 빈 문자열 → 빈 문자열 (에러 표시 안 함)", () => {
    expect(mapLoginErrorParam(undefined)).toBe("");
    expect(mapLoginErrorParam("")).toBe("");
  });

  it("알 수 없는 에러 코드 → 실패 메시지로 폴백 (조용한 실패 방지)", () => {
    expect(mapLoginErrorParam("server_error")).toBe(LOGIN_FAILED_MESSAGE);
    expect(mapLoginErrorParam("temporarily_unavailable")).toBe(
      LOGIN_FAILED_MESSAGE
    );
    expect(mapLoginErrorParam("xss<script>")).toBe(LOGIN_FAILED_MESSAGE);
  });
});

describe("GoogleSignInButton — 정적 contract 검사", () => {
  const buttonPath = resolve(
    __dirname,
    "../src/app/auth/login/_components/GoogleSignInButton.tsx"
  );
  const source = readFileSync(buttonPath, "utf8");

  it("\"use client\" 지시어로 시작 (브라우저 컴포넌트)", () => {
    expect(source.trimStart().startsWith('"use client"')).toBe(true);
  });

  it("signInWithOAuth 를 호출한다", () => {
    expect(source).toContain("signInWithOAuth");
  });

  it("provider: \"google\" 으로 호출한다", () => {
    expect(source).toMatch(/provider:\s*["']google["']/);
  });

  it("redirectTo 가 /auth/callback 으로 끝난다", () => {
    expect(source).toContain("redirectTo");
    expect(source).toContain("/auth/callback");
  });

  it("PIPA 동의 문구가 포함되어 있다 (수집 항목 명시)", () => {
    expect(source).toContain("이메일, 이름, 프로필 이미지");
    expect(source).toContain("개인정보처리방침");
  });

  it("로딩 중 이중 클릭 방지 (disabled={loading})", () => {
    expect(source).toMatch(/disabled=\{loading\}/);
  });
});

describe("/auth/login 페이지 — server component 패턴", () => {
  const pagePath = resolve(__dirname, "../src/app/auth/login/page.tsx");
  const source = readFileSync(pagePath, "utf8");

  it("\"use client\" 가 없다 (server component)", () => {
    expect(source.trimStart().startsWith('"use client"')).toBe(false);
  });

  it("supabase-server 의 createClient 를 사용한다", () => {
    expect(source).toContain('from "@/lib/supabase-server"');
  });

  it("getUser() 호출 후 인증된 사용자를 /dashboard 로 redirect", () => {
    expect(source).toContain("supabase.auth.getUser()");
    expect(source).toMatch(/redirect\(["']\/dashboard["']\)/);
  });

  it("좌측 에디토리얼 카피가 OAuth 에 맞게 업데이트됨", () => {
    expect(source).toContain("Google 계정 하나로 이어집니다");
    expect(source).not.toContain("이메일 한 통으로 로그인");
  });

  it("GoogleSignInButton 을 import 하여 렌더한다", () => {
    expect(source).toContain("GoogleSignInButton");
  });
});
