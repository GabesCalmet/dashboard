import { forwardRef } from "react";

// The one standard birthday message, in English (matching this being an
// English school's own messaging to English-learning students) — {name}
// is the only variable part, filled in from the (editable, not persisted)
// name field in BirthdayCardDialog.
export function birthdayMessage(name: string) {
  return `Hi ${name}! 🎉

Happy birthday! Today is your special day, and we are very happy to celebrate this day with you.

We wish you love, health, and success, today and all year long. May this new year of your life be your best one until now!

Thank you for trusting us with your English journey. We're proud of your progress and happy to continue to help you with your learning.

With love,
The Upfront Team 💙`;
}

// "Bold Navy" design — the direction picked from the three drafted
// options. Portrait rather than a strict square so the real (fairly
// long) message fits without crowding the logo/headline or shrinking
// the text too small to read.
export const BirthdayCard = forwardRef<HTMLDivElement, { name: string }>(function BirthdayCard(
  { name },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: 540,
        height: 700,
        boxSizing: "border-box",
        background: "#0B2254",
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
        color: "#FFFFFF",
      }}
    >
      {/* confetti, kept to the corners so it never collides with the message */}
      <div style={{ position: "absolute", left: 32, top: 54, width: 12, height: 12, borderRadius: "50%", background: "#E8702A" }} />
      <div style={{ position: "absolute", left: 72, top: 36, width: 6, height: 20, borderRadius: 3, background: "#FFFFFF", transform: "rotate(24deg)" }} />
      <div style={{ position: "absolute", right: 36, top: 60, width: 10, height: 10, borderRadius: "50%", background: "#5B9BD5" }} />
      <div style={{ position: "absolute", right: 68, top: 110, width: 6, height: 18, borderRadius: 3, background: "#E8702A", transform: "rotate(-18deg)" }} />
      <div style={{ position: "absolute", left: 28, bottom: 90, width: 11, height: 11, borderRadius: "50%", background: "#E8702A" }} />
      <div style={{ position: "absolute", left: 60, bottom: 50, width: 6, height: 17, borderRadius: 3, background: "#FFFFFF", transform: "rotate(-30deg)" }} />
      <div style={{ position: "absolute", right: 34, bottom: 86, width: 9, height: 9, borderRadius: "50%", background: "#FFFFFF" }} />
      <div style={{ position: "absolute", right: 64, bottom: 50, width: 6, height: 17, borderRadius: 3, background: "#5B9BD5", transform: "rotate(22deg)" }} />

      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 50px 36px",
          boxSizing: "border-box",
        }}
      >
        <img
          src="/brand/upfront-logo.png"
          alt="Upfront Idiomas"
          style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }}
        />

        <div style={{ marginTop: 18, fontSize: 30, fontWeight: 800, letterSpacing: -0.3, textAlign: "center", lineHeight: 1.1 }}>
          Happy Birthday!
        </div>

        <div style={{ marginTop: 14, width: 54, height: 3, background: "#E8702A" }} />

        <div style={{ marginTop: 24, flex: 1, display: "flex", alignItems: "center", width: "100%" }}>
          <p
            style={{
              margin: 0,
              fontSize: 15.5,
              lineHeight: 1.6,
              textAlign: "left",
              color: "rgba(255,255,255,0.92)",
              whiteSpace: "pre-line",
            }}
          >
            {birthdayMessage(name || "there")}
          </p>
        </div>

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 40, height: 2, background: "rgba(255,255,255,0.3)" }} />
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>
            Upfront Idiomas
          </div>
        </div>
      </div>
    </div>
  );
});
