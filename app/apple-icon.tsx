import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon: same vinyl-record mark as /icon at home-screen size. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <div
          style={{
            width: "76%",
            height: "76%",
            borderRadius: "50%",
            background: "#18181b",
            border: "4px solid #3f3f46",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "34%",
              height: "34%",
              borderRadius: "50%",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "18%",
                height: "18%",
                borderRadius: "50%",
                background: "#0a0a0a",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
