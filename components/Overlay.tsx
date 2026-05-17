"use client";

import { DetectionResult } from "@/lib/types";
import { formatTime } from "@/lib/imageUtils";

interface OverlayProps {
  result: DetectionResult | null;
  isProcessing: boolean;
  lastError: string | null;
}

export default function Overlay({ result, isProcessing, lastError }: OverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
        overflow: "hidden",
      }}
    >
      {/* Top-left: scene label */}
      {result && (
        <div
          style={{
            position: "absolute",
            top: "var(--space-4)",
            left: "var(--space-4)",
            background: "rgba(10,10,11,0.82)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3) var(--space-4)",
            maxWidth: "calc(100% - var(--space-8))",
            transition: "opacity var(--transition-base)",
            opacity: isProcessing ? 0.6 : 1,
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "var(--space-1)",
            }}
          >
            Scene
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-primary)",
              lineHeight: 1.4,
              fontWeight: 400,
            }}
          >
            {result.scene}
          </div>
        </div>
      )}

      {/* Top-right: confidence badge */}
      {result && (
        <div
          style={{
            position: "absolute",
            top: "var(--space-4)",
            right: "var(--space-4)",
          }}
        >
          <ConfidenceBadge confidence={result.confidence} />
        </div>
      )}

      {/* Bottom: processing pulse or error */}
      <div
        style={{
          position: "absolute",
          bottom: "var(--space-4)",
          left: "var(--space-4)",
          right: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <PulseDot active={isProcessing} error={!!lastError} />
          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: lastError
                ? "var(--accent-red)"
                : isProcessing
                ? "var(--accent-blue)"
                : "var(--text-tertiary)",
              letterSpacing: "0.04em",
            }}
          >
            {lastError
              ? "Inference error"
              : isProcessing
              ? "Processing frame"
              : result
              ? "Scene interpretation active"
              : "Awaiting frame"}
          </span>
        </div>
        {result && (
          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-tertiary)",
            }}
          >
            {formatTime(result.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: "high" | "medium" | "low";
}) {
  const colors = {
    high: { bg: "var(--accent-green-dim)", text: "var(--accent-green)", border: "#166534" },
    medium: { bg: "var(--accent-amber-dim)", text: "var(--accent-amber)", border: "#713f12" },
    low: { bg: "var(--accent-red-dim)", text: "var(--accent-red)", border: "#7f1d1d" },
  };
  const c = colors[confidence];

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: "var(--radius-sm)",
        padding: "2px var(--space-2)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
      }}
    >
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: c.text,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          color: c.text,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {confidence}
      </span>
    </div>
  );
}

function PulseDot({ active, error }: { active: boolean; error: boolean }) {
  return (
    <div
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: error
          ? "var(--accent-red)"
          : active
          ? "var(--accent-blue)"
          : "var(--text-tertiary)",
        flexShrink: 0,
        animation: active && !error ? "pulse 1.4s ease-in-out infinite" : "none",
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
