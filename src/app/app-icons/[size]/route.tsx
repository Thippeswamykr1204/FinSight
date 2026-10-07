import { ImageResponse } from "next/og";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: parameter } = await params;
  if (!["192", "512"].includes(parameter))
    return new Response("Not found", { status: 404 });
  const size = Number(parameter);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#101b16",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: size * 0.43,
          height: size * 0.43,
          border: `${size * 0.045}px solid #54d99a`,
          borderBottomColor: "transparent",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(35deg)",
        }}
      >
        <div
          style={{
            width: size * 0.09,
            height: size * 0.09,
            background: "#b8f2d0",
            borderRadius: "50%",
          }}
        />
      </div>
    </div>,
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
