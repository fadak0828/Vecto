import { ImageResponse } from "next/og";

export const alt = "좌표.to — 짧고 의미있는 한글 URL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/,
  );
  if (!resource?.[1]) throw new Error("Failed to load font");
  const res = await fetch(resource[1]);
  if (!res.ok) throw new Error("Failed to download font");
  return res.arrayBuffer();
}

export default async function Image() {
  const text =
    "좌표.to짧고 의미있는한글 URL/go/오늘강의무료로 시작하기";
  const [bold, regular] = await Promise.all([
    loadGoogleFont("Noto+Sans+KR:wght@800", text),
    loadGoogleFont("Noto+Sans+KR:wght@500", text),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #f9f9f9 0%, #ededed 60%, #e2dfde 100%)",
          color: "#1a1c1c",
          fontFamily: "Noto Sans KR",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 32,
            letterSpacing: "-0.01em",
            color: "#444746",
          }}
        >
          좌표.to
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 120,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#1a1c1c",
            }}
          >
            짧고 의미있는
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 120,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              background: "linear-gradient(135deg, #006565 0%, #008080 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            한글 URL
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 36,
            color: "#444746",
          }}
        >
          <div style={{ display: "flex" }}>좌표.to/go/오늘강의</div>
          <div
            style={{
              display: "flex",
              padding: "18px 36px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #006565 0%, #008080 100%)",
              color: "#ffffff",
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            무료로 시작하기
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Noto Sans KR", data: regular, weight: 500, style: "normal" },
        { name: "Noto Sans KR", data: bold, weight: 800, style: "normal" },
      ],
    },
  );
}
