// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import {
  SublinkDetailModal,
  type SublinkDetailModalLink,
} from "@/components/sublink-detail-modal";

// Mock qrcode — homepage 패턴과 동일하게 default export 사용.
const toDataURLMock = vi.fn().mockResolvedValue("data:image/png;base64,mocked");
vi.mock("qrcode", () => ({
  default: { toDataURL: toDataURLMock },
}));

function baseLink(overrides: Partial<SublinkDetailModalLink> = {}): SublinkDetailModalLink {
  return {
    id: "slug-1",
    slug: "노션",
    target_url: "https://www.notion.so/page",
    og_title: null,
    og_description: null,
    og_image: null,
    og_fetch_error: null,
    ...overrides,
  };
}

// navigator.clipboard mock (jsdom에 기본 구현 없음)
const writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(globalThis.navigator, "clipboard", {
  value: { writeText: writeTextMock },
  configurable: true,
});

beforeEach(() => {
  toDataURLMock.mockClear();
  writeTextMock.mockClear();
});

describe("SublinkDetailModal", () => {
  it("does NOT render when open=false", () => {
    render(
      <SublinkDetailModal
        open={false}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    // Modal is portaled to document.body — search from document, not container.
    expect(
      document.querySelector('[data-testid="sublink-detail-modal"]'),
    ).toBeNull();
  });

  it("renders when open=true (portaled to body)", async () => {
    render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    // Portal gate: mounted effect runs post-mount, so modal appears async.
    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="sublink-detail-modal"]'),
      ).not.toBeNull(),
    );
  });

  it("displays the full 좌표.to URL prominently", () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ slug: "노션" })}
        namespaceName="fadak"
      />
    );
    expect(getByTestId("sublink-modal-url").textContent).toBe("좌표.to/fadak/노션");
  });

  it("calls qrcode.toDataURL with the full URL and homepage options", async () => {
    render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ slug: "노션" })}
        namespaceName="fadak"
      />
    );
    await waitFor(() => expect(toDataURLMock).toHaveBeenCalled());
    const [url, opts] = toDataURLMock.mock.calls[0];
    expect(url).toBe("https://좌표.to/fadak/노션");
    expect(opts).toMatchObject({
      margin: 1,
      width: 480,
      color: { dark: "#1a1c1c", light: "#00000000" },
    });
  });

  it("renders QR image after toDataURL resolves", async () => {
    const { findByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    const img = (await findByTestId("sublink-modal-qr")) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("data:image/png;base64,mocked");
  });

  it("copy button writes the URL to clipboard", async () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ slug: "노션" })}
        namespaceName="fadak"
      />
    );
    fireEvent.click(getByTestId("sublink-modal-copy"));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledOnce());
    expect(writeTextMock).toHaveBeenCalledWith("https://좌표.to/fadak/노션");
  });

  it("copy button shows '복사됨' toast after click", async () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    const btn = getByTestId("sublink-modal-copy");
    expect(btn.textContent).toBe("URL 복사");
    fireEvent.click(btn);
    await waitFor(() => expect(btn.textContent).toBe("복사됨"));
  });

  it("ESC key calls onClose", () => {
    const onClose = vi.fn();
    render(
      <SublinkDetailModal
        open={true}
        onClose={onClose}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("background click calls onClose", () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={onClose}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    fireEvent.click(getByTestId("sublink-detail-modal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("click inside card does NOT call onClose (stopPropagation)", () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={onClose}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    fireEvent.click(getByTestId("sublink-detail-card"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("'다시 가져오기' button shown when onRefreshOG provided", () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ og_fetch_error: "timeout" })}
        namespaceName="fadak"
        onRefreshOG={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(getByTestId("sublink-modal-refresh")).toBeTruthy();
  });

  it("'다시 가져오기' calls onRefreshOG with link.id", async () => {
    const onRefreshOG = vi.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ id: "abc-123" })}
        namespaceName="fadak"
        onRefreshOG={onRefreshOG}
      />
    );
    await act(async () => {
      fireEvent.click(getByTestId("sublink-modal-refresh"));
    });
    expect(onRefreshOG).toHaveBeenCalledWith("abc-123");
  });

  it("og_description IS shown in modal (unlike the card)", () => {
    const description = "이것은 설명입니다";
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ og_description: description })}
        namespaceName="fadak"
      />
    );
    expect(getByTestId("sublink-modal-og-description").textContent).toBe(description);
  });

  it("og_fetch_error shows error message", () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink({ og_fetch_error: "timeout" })}
        namespaceName="fadak"
      />
    );
    expect(getByTestId("sublink-modal-og-error").textContent).toContain("timeout");
  });

  it("focus returns to close button on open", async () => {
    const { getByTestId } = render(
      <SublinkDetailModal
        open={true}
        onClose={() => {}}
        link={baseLink()}
        namespaceName="fadak"
      />
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(getByTestId("sublink-modal-close"))
    );
  });

  describe("이미지로 저장", () => {
    // jsdom은 HTMLCanvasElement.toBlob / getContext를 기본 구현하지 않는다.
    // URL.createObjectURL도 없다. 테스트 범위에서만 필요한 surface를 stub.
    const ctxMock = {
      fillRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      fillStyle: "",
      font: "",
      textAlign: "",
      textBaseline: "",
    };
    let toBlobMock: ReturnType<typeof vi.fn>;
    let createObjectURLMock: ReturnType<typeof vi.fn>;
    let revokeObjectURLMock: ReturnType<typeof vi.fn>;
    let anchorClickMock: ReturnType<typeof vi.fn>;
    let originalImage: typeof Image;

    beforeEach(() => {
      toBlobMock = vi.fn((cb: (b: Blob | null) => void) => {
        cb(new Blob(["png-bytes"], { type: "image/png" }));
      });
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        value: vi.fn().mockReturnValue(ctxMock),
        configurable: true,
      });
      Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
        value: toBlobMock,
        configurable: true,
      });
      createObjectURLMock = vi.fn().mockReturnValue("blob:mock");
      revokeObjectURLMock = vi.fn();
      // @ts-expect-error jsdom missing URL statics
      URL.createObjectURL = createObjectURLMock;
      // @ts-expect-error jsdom missing URL statics
      URL.revokeObjectURL = revokeObjectURLMock;
      anchorClickMock = vi.fn();
      // Stub <a>.click — jsdom 기본 구현은 navigation을 시도하지 않지만
      // 호출 여부를 검증하려면 직접 spy 해야 한다.
      Object.defineProperty(HTMLAnchorElement.prototype, "click", {
        value: anchorClickMock,
        configurable: true,
      });
      // Image 로드 stub — src 세팅 즉시 onload.
      originalImage = globalThis.Image;
      // @ts-expect-error minimal Image stub
      globalThis.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      };
    });

    afterEach(() => {
      globalThis.Image = originalImage;
    });

    it("renders the '이미지로 저장' button", () => {
      const { getByTestId } = render(
        <SublinkDetailModal
          open={true}
          onClose={() => {}}
          link={baseLink()}
          namespaceName="fadak"
        />
      );
      const btn = getByTestId("sublink-modal-download");
      expect(btn.textContent).toContain("이미지로 저장");
    });

    it("clicking triggers canvas composition + download", async () => {
      const { getByTestId } = render(
        <SublinkDetailModal
          open={true}
          onClose={() => {}}
          link={baseLink({ slug: "유튜브" })}
          namespaceName="송민우"
        />
      );
      // Wait for initial QR generation.
      await waitFor(() => expect(toDataURLMock).toHaveBeenCalled());
      toDataURLMock.mockClear();

      await act(async () => {
        fireEvent.click(getByTestId("sublink-modal-download"));
      });

      // QR은 저장용으로 한 번 더 생성됨 (흰 배경).
      await waitFor(() => expect(toDataURLMock).toHaveBeenCalled());
      // Canvas → Blob → ObjectURL → anchor.click 순으로 호출됐는지 확인.
      await waitFor(() => expect(toBlobMock).toHaveBeenCalled());
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(anchorClickMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalled();
    });

    it("save button shows '저장 중...' while downloading", async () => {
      // toBlob을 지연시켜 로딩 상태를 관찰한다.
      let resolveBlob: () => void = () => {};
      toBlobMock.mockImplementation((cb: (b: Blob | null) => void) => {
        setTimeout(() => {
          resolveBlob = () => cb(new Blob(["png"], { type: "image/png" }));
          resolveBlob();
        }, 30);
      });
      const { getByTestId } = render(
        <SublinkDetailModal
          open={true}
          onClose={() => {}}
          link={baseLink()}
          namespaceName="fadak"
        />
      );
      await waitFor(() => expect(toDataURLMock).toHaveBeenCalled());

      fireEvent.click(getByTestId("sublink-modal-download"));
      // 동기적으로 버튼 라벨이 바뀌어야 함.
      expect(getByTestId("sublink-modal-download").textContent).toContain(
        "저장 중..."
      );
      // 원상 복구될 때까지 대기.
      await waitFor(() =>
        expect(getByTestId("sublink-modal-download").textContent).toContain(
          "이미지로 저장"
        )
      );
    });

    it("save button is disabled while downloading (prevents double-fire)", async () => {
      const releaseRef: { fn: (() => void) | null } = { fn: null };
      toBlobMock.mockImplementation((cb: (b: Blob | null) => void) => {
        releaseRef.fn = () => cb(new Blob(["png"], { type: "image/png" }));
      });
      const { getByTestId } = render(
        <SublinkDetailModal
          open={true}
          onClose={() => {}}
          link={baseLink()}
          namespaceName="fadak"
        />
      );
      await waitFor(() => expect(toDataURLMock).toHaveBeenCalled());

      fireEvent.click(getByTestId("sublink-modal-download"));
      await waitFor(() =>
        expect(
          (getByTestId("sublink-modal-download") as HTMLButtonElement).disabled
        ).toBe(true)
      );
      // 저장 완료시켜 cleanup
      releaseRef.fn?.();
    });

    it("download filename includes namespace and slug", async () => {
      // <a>.download 속성은 anchor 객체를 들여다봐야 한다.
      const downloadSpy = vi.fn();
      Object.defineProperty(HTMLAnchorElement.prototype, "click", {
        value: function (this: HTMLAnchorElement) {
          downloadSpy(this.download);
        },
        configurable: true,
      });
      const { getByTestId } = render(
        <SublinkDetailModal
          open={true}
          onClose={() => {}}
          link={baseLink({ slug: "유튜브" })}
          namespaceName="송민우"
        />
      );
      await waitFor(() => expect(toDataURLMock).toHaveBeenCalled());

      await act(async () => {
        fireEvent.click(getByTestId("sublink-modal-download"));
      });
      await waitFor(() => expect(downloadSpy).toHaveBeenCalled());
      // 가장 마지막 anchor click이 이 테스트의 저장 트리거.
      const lastCall = downloadSpy.mock.calls[downloadSpy.mock.calls.length - 1];
      const filename = lastCall[0] as string;
      expect(filename).toContain("송민우");
      expect(filename).toContain("유튜브");
      expect(filename).toMatch(/\.png$/);
    });
  });
});
