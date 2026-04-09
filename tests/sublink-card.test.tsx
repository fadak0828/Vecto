// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { SublinkCard, type SublinkCardLink } from "@/components/sublink-card";

// SublinkCard 라이브 variant는 내부적으로 SublinkQRButton → SublinkDetailModal
// 체인을 가진다. 모달은 open=false 상태로 시작하므로 qrcode는 import되지
// 않지만, 실수로 상태가 바뀌어도 테스트가 안전하도록 mock.
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mocked"),
  },
}));

function base(overrides: Partial<SublinkCardLink> = {}): SublinkCardLink {
  return {
    slug: "노션",
    target_url: "https://www.notion.so/page",
    og_title: null,
    og_image: null,
    og_description: null,
    og_site_name: null,
    ...overrides,
  };
}

describe("SublinkCard", () => {
  it("renders og_image when present", () => {
    const { container } = render(
      <SublinkCard
        link={base({
          og_title: "강의자료 노션",
          og_image: "https://example.com/og.png",
        })}
        namespaceName="fadak"
        variant="live"
      />
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/og.png");
    expect(img?.getAttribute("alt")).toBe("");
    // Referrer must be stripped — og_image comes from an untrusted upstream.
    expect(img?.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("renders initial box when og_image is null", () => {
    const { container } = render(
      <SublinkCard
        link={base({ og_title: "강의자료 노션", og_image: null })}
        namespaceName="fadak"
        variant="live"
      />
    );
    expect(container.querySelector("img")).toBeNull();
    // aria-hidden initial box should be present
    const initial = container.querySelector('[aria-hidden="true"]');
    expect(initial).not.toBeNull();
  });

  it("initial box always uses first char of slug (not og_title)", () => {
    // User feedback 20260409: slug is the manager-set name and is the primary
    // identity. og_title is never the headline and never the initial box char.
    const { getByText, queryByText } = render(
      <SublinkCard
        link={base({ og_title: "강의자료 노션", og_image: null, slug: "노션" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    expect(getByText("노")).toBeTruthy();
    expect(queryByText("강")).toBeNull();
  });

  it("initial box uses slug first char when og_title missing too", () => {
    const { getByText } = render(
      <SublinkCard
        link={base({ og_title: null, og_image: null, slug: "유튜브" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    expect(getByText("유")).toBeTruthy();
  });

  it("NEVER renders og_description in the card (regression guard)", () => {
    const description = "이것은 설명이며 카드에 절대 노출되면 안 됩니다";
    const { container } = render(
      <SublinkCard
        link={base({
          og_title: "제목",
          og_description: description,
        })}
        namespaceName="fadak"
        variant="live"
      />
    );
    expect(container.textContent ?? "").not.toContain(description);
  });

  it("NEVER renders og_title in the card (card shows slug as primary)", () => {
    // User feedback 20260409: slug is the headline, not og_title.
    // og_title remains visible in the detail modal only.
    const { container } = render(
      <SublinkCard
        link={base({
          slug: "유튜브",
          og_title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
        })}
        namespaceName="fadak"
        variant="live"
      />
    );
    expect(container.textContent ?? "").not.toContain("Rick Astley");
    expect(container.textContent ?? "").toContain("유튜브");
  });

  it("slug is rendered as the primary headline (bold, larger than meta)", () => {
    const { container } = render(
      <SublinkCard
        link={base({ slug: "유튜브" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    // Headline — bold, Plus Jakarta Sans, sized text-lg/sm:text-xl in live.
    const textNodes = Array.from(container.querySelectorAll("p"));
    const headline = textNodes.find((p) => p.textContent?.trim() === "유튜브");
    expect(headline).not.toBeUndefined();
    expect(headline?.className ?? "").toContain("font-bold");
  });

  it("live variant has an inner <a target=_blank rel=noopener noreferrer>", () => {
    const { container } = render(
      <SublinkCard
        link={base({ target_url: "https://example.com/" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    // After QR button restructure: outer div is sublink-card, inner anchor
    // is sublink-card-anchor (covers thumb+text+arrow only).
    const anchor = container.querySelector('[data-testid="sublink-card-anchor"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.tagName).toBe("A");
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(anchor?.getAttribute("href")).toBe("https://example.com/");
  });

  it("preview variant renders as <div>, no anchor", () => {
    const { container } = render(
      <SublinkCard
        link={base({ target_url: "https://example.com/" })}
        namespaceName="fadak"
        variant="preview"
      />
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector('[data-testid="sublink-card"]')).not.toBeNull();
  });

  it("live variant renders the SublinkQRButton as a sibling (not inside the anchor)", () => {
    const { container } = render(
      <SublinkCard link={base({})} namespaceName="fadak" variant="live" />
    );
    const qrBtn = container.querySelector('[data-testid="sublink-qr-button"]');
    expect(qrBtn).not.toBeNull();
    // Must NOT be nested inside the anchor — nested interactive elements are
    // invalid HTML and break a11y.
    const anchor = container.querySelector('[data-testid="sublink-card-anchor"]');
    expect(anchor?.contains(qrBtn!)).toBe(false);
  });

  it("preview variant does NOT render the SublinkQRButton", () => {
    const { container } = render(
      <SublinkCard link={base({})} namespaceName="fadak" variant="preview" />
    );
    expect(container.querySelector('[data-testid="sublink-qr-button"]')).toBeNull();
  });

  it("aria-label on live anchor uses slug (primary identity)", () => {
    const { container } = render(
      <SublinkCard
        link={base({ slug: "유튜브", og_title: "Something else entirely" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    const anchor = container.querySelector('[data-testid="sublink-card-anchor"]');
    expect(anchor?.getAttribute("aria-label")).toContain("유튜브");
    expect(anchor?.getAttribute("aria-label")).not.toContain("Something else");
  });

  it("slug meta has tnum font-feature-settings", () => {
    const { container } = render(
      <SublinkCard link={base({})} namespaceName="fadak" variant="live" />
    );
    const all = container.querySelectorAll("*");
    let found = false;
    all.forEach((el) => {
      const style = (el as HTMLElement).getAttribute("style") ?? "";
      if (style.includes("tnum")) found = true;
    });
    expect(found).toBe(true);
  });

  it("slug meta displays full 좌표.to/{ns}/{slug} path", () => {
    const { container } = render(
      <SublinkCard
        link={base({ slug: "노션" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    expect(container.textContent).toContain("좌표.to/fadak/노션");
  });

  it("does NOT use rounded-full anywhere (AI slop regression guard)", () => {
    const { container } = render(
      <SublinkCard
        link={base({ og_title: "제목", og_image: "https://example.com/x.png" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    const roundedFull = container.querySelectorAll(".rounded-full");
    expect(roundedFull.length).toBe(0);
  });

  it("does NOT use rounded-full on initial-box fallback either", () => {
    const { container } = render(
      <SublinkCard
        link={base({ og_title: "제목", og_image: null })}
        namespaceName="fadak"
        variant="live"
      />
    );
    expect(container.querySelectorAll(".rounded-full").length).toBe(0);
  });

  it("card root uses rounded-2xl (16px) per design spec", () => {
    const { container } = render(
      <SublinkCard
        link={base({ og_title: "제목" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    const card = container.querySelector('[data-testid="sublink-card"]');
    expect(card?.className).toContain("rounded-2xl");
  });
});
