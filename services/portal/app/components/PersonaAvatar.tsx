"use client";

export default function PersonaAvatar({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        left: 20,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <button
        onClick={onClick}
        title="Jason Calacanis"
        style={{
          all: "unset",
          cursor: "pointer",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          border: active
            ? "1.5px solid rgba(74, 243, 255, 0.6)"
            : "1px solid transparent",
          boxShadow: active
            ? "0 0 12px rgba(74, 243, 255, 0.3)"
            : "none",
          opacity: active ? 0.9 : undefined,
          animation: active ? "none" : "persona-pulse 4s ease-in-out infinite",
          transition: "opacity 300ms ease, border 300ms ease, box-shadow 300ms ease, transform 300ms ease",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.opacity = "0.7";
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(74, 243, 255, 0.2)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.opacity = "";
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          stroke="#4af3ff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Head */}
          <ellipse cx="16" cy="11" rx="6" ry="7" />
          {/* Neck + Shoulders */}
          <path d="M13 17.5C8 18.5 5 22 5 27h22c0-5-3-8.5-8-9.5" />
        </svg>
      </button>

      <span
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 7,
          color: "rgba(74, 243, 255, 0.15)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          pointerEvents: "none",
          userSelect: "none",
          animation: active ? "none" : "persona-pulse 4s ease-in-out infinite",
        }}
      >
        PERSONA
      </span>
    </div>
  );
}
