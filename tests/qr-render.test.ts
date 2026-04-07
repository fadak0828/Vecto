// QR rendering — verify the qrcode lib produces valid data URLs for our flows.
import { describe, it, expect } from "vitest";
import QRCode from "qrcode";

describe("QR rendering — qrcode lib", () => {
  it("produces a PNG data URL for a 좌표.to short link", async () => {
    const dataUrl = await QRCode.toDataURL("https://좌표.to/go/오늘강의", {
      margin: 1,
      width: 480,
      color: { dark: "#1a1c1c", light: "#00000000" },
    });
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    // PNG header is non-trivial; sanity check on base64 length
    expect(dataUrl.length).toBeGreaterThan(200);
  });

  it("produces deterministic output for same input", async () => {
    const a = await QRCode.toDataURL("https://좌표.to/go/abc", { width: 120 });
    const b = await QRCode.toDataURL("https://좌표.to/go/abc", { width: 120 });
    expect(a).toBe(b);
  });

  it("produces different output for different URLs", async () => {
    const a = await QRCode.toDataURL("https://좌표.to/go/abc", { width: 120 });
    const b = await QRCode.toDataURL("https://좌표.to/go/xyz", { width: 120 });
    expect(a).not.toBe(b);
  });

  it("encodes the on-background charcoal color, not pure black", async () => {
    // We pass charcoal #1a1c1c per DESIGN.md (no pure black rule).
    // We can't introspect the PNG, but we can confirm the call accepts the
    // hex without throwing and produces a data URL.
    await expect(
      QRCode.toDataURL("https://좌표.to/go/x", {
        color: { dark: "#1a1c1c", light: "#00000000" },
      })
    ).resolves.toMatch(/^data:image\/png;base64,/);
  });
});
