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
const settingsPage = readFileSync(
  resolve(root, "src/app/settings/page.tsx"),
  "utf-8"
);
const sharedComponent = readFileSync(
  resolve(root, "src/components/public-profile-view.tsx"),
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
