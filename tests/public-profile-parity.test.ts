// Regression test for preview/live page drift bug (investigate 2026-04-08).
//
// Bug: /settings had a hand-rolled "phone preview" (Linktree-clone with
// gradient cover + centered avatar) while /[namespace]/page.tsx rendered
// a completely different editorial layout. The two shared zero code and
// drifted visually. Users saw one thing in the preview, another thing on
// the actual public URL.
//
// Fix: extracted PublicProfileView as the single source of truth. Both
// pages now import and render it. This test guarantees that contract
// stays in place — if someone reintroduces bespoke markup on either page,
// this test fails.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");
const namespacePage = readFileSync(
  resolve(root, "src/app/[namespace]/page.tsx"),
  "utf-8"
);
// v0.10.x 까지는 settings/page.tsx 가 "use client" 로 모든 로직을 가지고
// 있었다. 2026-04-10 성능 리팩터로 page.tsx 는 server component 가 되고
// 실제 preview + SELECT 는 settings-client.tsx 로 이동했다. 이 테스트는
// drift 방지 목적이므로 실제 로직이 있는 client 파일을 읽는다.
const settingsPage = readFileSync(
  resolve(root, "src/app/settings/settings-client.tsx"),
  "utf-8"
);
// settings 의 데이터 SELECT 는 공유 서버 로더로 이동됨 — og_* 필드 검증은
// 여기서 수행.
const serverLoader = readFileSync(
  resolve(root, "src/lib/server/user-namespace.ts"),
  "utf-8"
);
const sharedComponent = readFileSync(
  resolve(root, "src/components/public-profile-view.tsx"),
  "utf-8"
);

const sublinkCardComponent = readFileSync(
  resolve(root, "src/components/sublink-card.tsx"),
  "utf-8"
);

describe("public profile parity — drift prevention", () => {
  it("/[namespace]/page.tsx imports and uses PublicProfileView", () => {
    expect(namespacePage).toContain(
      'import { PublicProfileView } from "@/components/public-profile-view"'
    );
    expect(namespacePage).toContain("<PublicProfileView");
    expect(namespacePage).toContain('variant="live"');
  });

  it("/settings/page.tsx imports and uses PublicProfileView", () => {
    expect(settingsPage).toContain(
      'import { PublicProfileView } from "@/components/public-profile-view"'
    );
    expect(settingsPage).toContain("<PublicProfileView");
    expect(settingsPage).toContain('variant="preview"');
  });

  it("PublicProfileView delegates link rendering to SublinkCard (no bespoke row markup)", () => {
    // Both live/preview variants must funnel through SublinkCard so the card
    // layout can never drift between pages. If someone reintroduces inline <a>
    // rendering in the links map, this test fails.
    expect(sharedComponent).toContain(
      'import { SublinkCard'
    );
    expect(sharedComponent).toContain("<SublinkCard");
  });

  it("SublinkCard has no 'use client' directive (usable in server components)", () => {
    expect(sublinkCardComponent).not.toMatch(/^['"]use client['"]/m);
  });

  it("SublinkCard live variant wires SublinkQRButton (visitor-facing QR feature)", () => {
    // If someone removes the QR button from the card, visitors lose the
    // in-person share affordance. This guard catches accidental regression.
    expect(sublinkCardComponent).toContain(
      'import { SublinkQRButton }'
    );
    expect(sublinkCardComponent).toContain("<SublinkQRButton");
  });

  it("both pages SELECT the og_* columns so SublinkCard has the data it needs", () => {
    // Regression guard: if someone shrinks the SELECT, SublinkCard silently
    // falls back to the initial-box state for every link on that page.
    // /[namespace] 는 페이지에서 직접 select.
    expect(namespacePage).toMatch(/og_title/);
    expect(namespacePage).toMatch(/og_image/);
    // /settings 는 공유 서버 로더(getUserNamespaceData)를 사용.
    expect(serverLoader).toMatch(/og_title/);
    expect(serverLoader).toMatch(/og_image/);
  });

  it("/settings/page.tsx does NOT re-introduce the old Linktree-style preview markup", () => {
    // The old preview had a gradient "Cover" div that the avatar
    // overlapped from below. This was the root cause of the drift —
    // a completely different layout pattern from the real page.
    // DESIGN.md says "High-End Editorial" — no Linktree clichés.
    expect(settingsPage).not.toMatch(/\{\/\* Cover \*\/\}/);
    expect(settingsPage).not.toMatch(/absolute -bottom-8 left-1\/2/);
    // Centered profile info — violates "Asymmetric Editorial" direction.
    expect(settingsPage).not.toMatch(/mt-10 px-5 text-center/);
  });

  it("/[namespace]/page.tsx does NOT contain inline profile markup anymore", () => {
    // Profile rendering must live exclusively in PublicProfileView so
    // there is no second place for someone to edit and cause drift.
    expect(namespacePage).not.toMatch(
      /Profile header[\s\S]*left-aligned[\s\S]*editorial/
    );
    expect(namespacePage).not.toContain("<ProfilePromoBanner");
  });

  it("PublicProfileView has no 'use client' directive (usable in both server and client components)", () => {
    // Critical: the component must be server-compatible because
    // /[namespace]/page.tsx is a server component. Adding hooks or
    // 'use client' would break that route.
    expect(sharedComponent).not.toMatch(/^['"]use client['"]/m);
  });

  it("PublicProfileView supports both variants", () => {
    expect(sharedComponent).toContain('variant?: "live" | "preview"');
  });
});
