// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SublinkCard, type SublinkCardLink } from "@/components/sublink-card";

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

  it("initial box uses first char of og_title when present", () => {
    const { getByText } = render(
      <SublinkCard
        link={base({ og_title: "강의자료 노션", og_image: null })}
        namespaceName="fadak"
        variant="live"
      />
    );
    expect(getByText("강")).toBeTruthy();
  });

  it("initial box uses first char of slug when og_title missing", () => {
    const { getByText } = render(
      <SublinkCard
        link={base({ og_title: null, og_image: null, slug: "노션" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    expect(getByText("노")).toBeTruthy();
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

  it("live variant wraps in <a target=_blank rel=noopener noreferrer>", () => {
    const { container } = render(
      <SublinkCard
        link={base({ target_url: "https://example.com/" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
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

  it("aria-label on live anchor includes og_title", () => {
    const { container } = render(
      <SublinkCard
        link={base({ og_title: "강의자료 노션" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("aria-label")).toContain("강의자료 노션");
  });

  it("aria-label falls back to slug when og_title missing", () => {
    const { container } = render(
      <SublinkCard
        link={base({ og_title: null, slug: "노션" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("aria-label")).toContain("노션");
  });

  it("og_title has line-clamp-2 applied", () => {
    const { container } = render(
      <SublinkCard
        link={base({ og_title: "아주 긴 제목입니다" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    const title = container.querySelector(".line-clamp-2");
    expect(title).not.toBeNull();
    expect(title?.textContent).toContain("아주 긴 제목");
  });

  it("slug meta has tnum font-feature-settings", () => {
    const { container } = render(
      <SublinkCard
        link={base({ og_title: "제목" })}
        namespaceName="fadak"
        variant="live"
      />
    );
    const all = container.querySelectorAll("*");
    let found = false;
    all.forEach((el) => {
      const style = (el as HTMLElement).getAttribute("style") ?? "";
      if (style.includes('tnum')) found = true;
    });
    expect(found).toBe(true);
  });

  it("slug meta displays full 좌표.to/{ns}/{slug} path", () => {
    const { container } = render(
      <SublinkCard
        link={base({ slug: "노션", og_title: "제목" })}
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
