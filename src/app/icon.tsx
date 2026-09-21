import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1c160e 0%, #2d2215 50%, #120d07 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "7px",
          border: "1.5px solid #d4af37",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 50 38 C 36 16 16 14 12 28 C 8 40 18 46 28 44 C 36 42 44 40 50 38 Z"
            fill="#ffd700"
          />
          <path
            d="M 50 38 C 64 16 84 14 88 28 C 92 40 82 46 72 44 C 64 42 56 40 50 38 Z"
            fill="#ffd700"
          />
          <polygon
            points="50,14 53,22 61,22 55,27 57,35 50,30 43,35 45,27 39,22 47,22"
            fill="#fff2a8"
          />
          <path d="M 34 44 C 20 46 16 54 20 60 C 24 62 32 54 36 48 Z" fill="#d4d4d8" />
          <path d="M 66 44 C 80 46 84 54 80 60 C 76 62 68 54 64 48 Z" fill="#d4d4d8" />
          <path d="M 36 42 L 64 42 L 60 68 L 50 84 L 40 68 Z" fill="#ffffff" />
          <path d="M 46 72 L 54 72 L 50 82 Z" fill="#d4af37" />
          <path d="M 50 82 L 48 90 L 52 90 Z" fill="#d4af37" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
