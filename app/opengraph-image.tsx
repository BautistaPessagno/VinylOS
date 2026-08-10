import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — Tu colección de vinilos`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dark-room palette, matching --room-* in globals.css. ImageResponse supports
// only flexbox, so the record is layered circles rather than a radial gradient.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#0e0d11",
          color: "#f2eff5",
          padding: "80px",
          gap: "72px",
        }}
      >
        <div
          style={{
            width: "380px",
            height: "380px",
            borderRadius: "50%",
            backgroundColor: "#17151c",
            border: "1px solid #2a2632",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              backgroundColor: "#e4573d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                backgroundColor: "#0e0d11",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "26px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#e4573d",
            }}
          >
            {SITE_NAME}
          </div>
          <div style={{ fontSize: "68px", lineHeight: 1.05, display: "flex" }}>
            Cada disco que tienes, hasta la edición exacta.
          </div>
          <div style={{ fontSize: "30px", color: "#9a93a5", display: "flex" }}>
            Colección, estadísticas y descubrimiento.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
