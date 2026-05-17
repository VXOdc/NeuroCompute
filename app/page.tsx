"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Camera, { CameraHandle } from "@/components/Camera";
import Overlay from "@/components/Overlay";
import {
  DetectionResult,
  PerformanceMetrics,
  SamplingMode,
  SystemStatus,
} from "@/lib/types";
import { formatLatency, formatTime } from "@/lib/imageUtils";

const SAMPLING_OPTIONS: { value: SamplingMode; label: string }[] = [
  { value: 300, label: "300ms" },
  { value: 500, label: "500ms" },
  { value: 700, label: "700ms" },
];

const HISTORY_MAX = 8;

export default function HomePage() {
  const cameraRef = useRef<CameraHandle>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latencyBuffer = useRef<number[]>([]);

  // BUG FIX 2: Guard against concurrent async invocations.
  // setInterval fires every N ms regardless of whether the previous async
  // call has resolved. Without this guard, multiple API calls pile up
  // simultaneously (4–6 in-flight at 300ms interval with ~2s API latency),
  // causing state collisions and wasted API spend.
  const processingRef = useRef(false);

  // BUG FIX 3 + 4: Move retryCount from state to a ref.
  // Previously retryCount was in useCallback's dependency array. Every error
  // incremented it → processFrame was recreated → the interval useEffect
  // re-fired → clearInterval + setInterval reset the loop mid-recovery.
  // Additionally, reading retryCount inside the catch block was always stale
  // (closure captured the value at creation time, not the current value).
  // A ref gives us the always-current value with zero re-render side-effects.
  const retryCountRef = useRef(0);

  const [isRunning, setIsRunning] = useState(false);
  const [samplingMode, setSamplingMode] = useState<SamplingMode>(500);
  const [currentResult, setCurrentResult] = useState<DetectionResult | null>(null);
  const [history, setHistory] = useState<DetectionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [status, setStatus] = useState<SystemStatus>({
    camera: "idle",
    pipeline: "idle",
    api: "idle",
  });
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    currentLatency: 0,
    avgLatency: 0,
    frameInterval: samplingMode,
    estimatedFps: 0,
    apiResponseTime: 0,
    lastInferenceAt: null,
    totalFrames: 0,
  });

  const processFrame = useCallback(async () => {
    // BUG FIX 2: Skip if a call is already in-flight.
    if (processingRef.current) return;
    if (!cameraRef.current) return;

    const frame = cameraRef.current.captureFrame();
    if (!frame) return;

    processingRef.current = true;
    const frameStart = Date.now();
    setIsProcessing(true);
    setStatus((s) => ({ ...s, pipeline: "processing", api: "idle" }));

    try {
      const apiStart = Date.now();
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame }),
      });
      const apiTime = Date.now() - apiStart;

      if (!res.ok) {
        throw new Error(`API ${res.status}`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error ?? "Empty response");
      }

      const result: DetectionResult = json.data;
      const totalLatency = Date.now() - frameStart;

      latencyBuffer.current = [...latencyBuffer.current.slice(-19), totalLatency];
      const avg =
        latencyBuffer.current.reduce((a, b) => a + b, 0) /
        latencyBuffer.current.length;

      retryCountRef.current = 0;
      setCurrentResult(result);
      setLastError(null);
      setHistory((h) => [result, ...h].slice(0, HISTORY_MAX));
      setStatus((s) => ({ ...s, pipeline: "idle", api: "ok" }));
      setMetrics((m) => ({
        currentLatency: totalLatency,
        avgLatency: Math.round(avg),
        frameInterval: samplingMode,
        estimatedFps: Math.round(1000 / samplingMode),
        apiResponseTime: apiTime,
        lastInferenceAt: Date.now(),
        totalFrames: m.totalFrames + 1,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      // BUG FIX 4: Read retryCount from ref — always current, never stale.
      retryCountRef.current += 1;
      const currentRetry = retryCountRef.current;
      setLastError(msg);
      setStatus((s) => ({
        ...s,
        pipeline: "error",
        api: currentRetry < 3 ? "retrying" : "error",
      }));
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
    // BUG FIX 3: samplingMode is the only legitimate dep here. retryCount is
    // gone from state; the processing guard and retry logic use refs instead.
    // Removing retryCount from deps means processFrame keeps a stable
    // reference across errors, so the interval useEffect below never
    // unnecessarily resets the loop.
  }, [samplingMode]);

  // Start/stop sampling loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isRunning) {
      intervalRef.current = setInterval(processFrame, samplingMode);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, samplingMode, processFrame]);

  const togglePipeline = () => {
    if (!isRunning) {
      setLastError(null);
      retryCountRef.current = 0;
      processingRef.current = false;
    }
    setIsRunning((v) => !v);
  };

  const cameraReady = status.camera === "active";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      {/* Top Navigation */}
      <header style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-6)",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <LogoMark />
          <div>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              NeuroCompute
            </span>
            <span style={{ color: "var(--text-tertiary)", fontSize: "12px", marginLeft: "var(--space-2)" }}>
              Vision System
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <StatusPill label="Vision Pipeline" status={status.pipeline} />
          <StatusPill label="API" status={status.api} />
          <StatusPill label="Camera" status={status.camera} />
        </div>
      </header>

      {/* Main content */}
      <main style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gridTemplateRows: "1fr auto",
        gap: "var(--space-4)",
        padding: "var(--space-4)",
        maxHeight: "calc(100vh - 52px)",
        overflow: "hidden",
      }}>
        {/* Camera Viewport */}
        <div style={{
          gridColumn: "1",
          gridRow: "1 / 3",
          position: "relative",
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          overflow: "hidden",
          minHeight: 0,
        }}>
          <Camera
            ref={cameraRef}
            onStatusChange={(s) => setStatus((prev) => ({ ...prev, camera: s }))}
            onError={(msg) => setLastError(msg)}
          />
          <Overlay
            result={currentResult}
            isProcessing={isProcessing}
            lastError={lastError}
          />

          {/* Camera error state */}
          {status.camera === "error" && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-elevated)",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}>
              <div style={{ color: "var(--accent-red)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                Camera access denied
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: "12px", maxWidth: 280, textAlign: "center" }}>
                Allow camera permissions in your browser settings to use NeuroCompute.
              </div>
            </div>
          )}
        </div>

        {/* Right column: Controls + Metrics + Results */}
        <div style={{
          gridColumn: "2",
          gridRow: "1 / 3",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          overflow: "auto",
          minHeight: 0,
        }}>
          {/* Pipeline Control */}
          <Panel title="Pipeline Control">
            <button
              onClick={togglePipeline}
              disabled={status.camera === "error" || status.camera === "requesting"}
              style={{
                width: "100%",
                height: 40,
                borderRadius: "var(--radius-md)",
                border: "1px solid",
                borderColor: isRunning ? "var(--border-default)" : "var(--accent-blue-dim)",
                background: isRunning ? "var(--bg-subtle)" : "rgba(59,130,246,0.1)",
                color: isRunning ? "var(--text-secondary)" : "var(--accent-blue)",
                fontSize: "13px",
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                cursor: status.camera === "error" ? "not-allowed" : "pointer",
                opacity: status.camera === "requesting" ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-2)",
                transition: "all var(--transition-base)",
                letterSpacing: "0.01em",
              }}
            >
              {isRunning ? (
                <>
                  <StopIcon />
                  Stop Pipeline
                </>
              ) : (
                <>
                  <PlayIcon />
                  Start Pipeline
                </>
              )}
            </button>

            {/* Sampling mode */}
            <div style={{ marginTop: "var(--space-4)" }}>
              <div style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-tertiary)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "var(--space-2)",
              }}>
                Sampling Interval
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                {SAMPLING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSamplingMode(opt.value)}
                    style={{
                      height: 32,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid",
                      borderColor: samplingMode === opt.value ? "var(--accent-blue)" : "var(--border-default)",
                      background: samplingMode === opt.value ? "rgba(59,130,246,0.12)" : "transparent",
                      color: samplingMode === opt.value ? "var(--accent-blue)" : "var(--text-secondary)",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{
                marginTop: "var(--space-2)",
                fontSize: "11px",
                color: "var(--text-tertiary)",
                lineHeight: 1.5,
              }}>
                {samplingMode === 300
                  ? "Higher responsiveness · increased API load"
                  : samplingMode === 700
                  ? "Reduced API load · lower responsiveness"
                  : "Balanced responsiveness and API efficiency"}
              </div>
            </div>
          </Panel>

          {/* Performance Metrics */}
          <Panel title="Performance">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
              <MetricCell label="Latency" value={metrics.currentLatency ? formatLatency(metrics.currentLatency) : "—"} highlight={metrics.currentLatency > 2000} />
              <MetricCell label="Avg Latency" value={metrics.avgLatency ? formatLatency(metrics.avgLatency) : "—"} />
              <MetricCell label="Frame Interval" value={`${metrics.frameInterval}ms`} />
              <MetricCell label="Est. FPS" value={isRunning ? `${metrics.estimatedFps}` : "—"} />
              <MetricCell label="API Response" value={metrics.apiResponseTime ? formatLatency(metrics.apiResponseTime) : "—"} />
              <MetricCell label="Total Frames" value={metrics.totalFrames > 0 ? `${metrics.totalFrames}` : "—"} />
            </div>
            {metrics.lastInferenceAt && (
              <div style={{
                marginTop: "var(--space-3)",
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-tertiary)",
              }}>
                Last inference: {formatTime(metrics.lastInferenceAt)}
              </div>
            )}
          </Panel>

          {/* Detected Objects */}
          <Panel title="Detected Objects" style={{ flex: 1 }}>
            {currentResult && currentResult.objects.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {currentResult.objects.map((obj, i) => (
                  <ObjectTag key={i} label={obj.label} detail={obj.detail} />
                ))}
              </div>
            ) : (
              <EmptyState text={isProcessing ? "Processing frame..." : "No objects detected"} />
            )}

            {currentResult?.summary && (
              <div style={{
                marginTop: "var(--space-3)",
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: "12px",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}>
                {currentResult.summary}
              </div>
            )}
          </Panel>

          {/* Detection History */}
          <Panel title="Detection History" style={{ maxHeight: 220, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {history.length === 0 ? (
              <EmptyState text="No history yet" />
            ) : (
              <div style={{ overflow: "auto", flex: 1 }}>
                {history.map((r, i) => (
                  <div
                    key={r.timestamp}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "var(--space-3)",
                      padding: "var(--space-2) 0",
                      borderBottom: i < history.length - 1 ? "1px solid var(--border-subtle)" : "none",
                      opacity: i === 0 ? 1 : 0.55,
                    }}
                  >
                    <span style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-tertiary)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {formatTime(r.timestamp)}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {r.scene}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Panel({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-4)",
      ...style,
    }}>
      <div style={{
        fontSize: "11px",
        fontFamily: "var(--font-mono)",
        color: "var(--text-tertiary)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: "var(--space-3)",
        fontWeight: 500,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function MetricCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: "var(--bg-elevated)",
      borderRadius: "var(--radius-sm)",
      padding: "var(--space-3)",
    }}>
      <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", letterSpacing: "0.05em", marginBottom: "var(--space-1)" }}>
        {label}
      </div>
      <div style={{
        fontSize: "14px",
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        color: highlight ? "var(--accent-amber)" : "var(--text-primary)",
        letterSpacing: "-0.02em",
      }}>
        {value}
      </div>
    </div>
  );
}

function ObjectTag({ label, detail }: { label: string; detail?: string }) {
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-sm)",
      padding: "var(--space-1) var(--space-3)",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-1)",
    }}>
      <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
        {label}
      </span>
      {detail && (
        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
          · {detail}
        </span>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: "var(--space-4)",
      textAlign: "center",
      fontSize: "12px",
      fontFamily: "var(--font-mono)",
      color: "var(--text-tertiary)",
    }}>
      {text}
    </div>
  );
}

function StatusPill({ label, status }: { label: string; status: string }) {
  const color =
    status === "active" || status === "ok"
      ? "var(--accent-green)"
      : status === "processing" || status === "requesting"
      ? "var(--accent-blue)"
      : status === "error"
      ? "var(--accent-red)"
      : status === "retrying"
      ? "var(--accent-amber)"
      : "var(--text-tertiary)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", letterSpacing: "0.04em" }}>
        {label}
      </span>
    </div>
  );
}

function LogoMark() {
  return (
    <div style={{
      width: 28,
      height: 28,
      borderRadius: 8,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-default)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2" fill="var(--accent-blue)" />
        <circle cx="7" cy="7" r="5" stroke="var(--accent-blue)" strokeWidth="1" strokeDasharray="2 2" fill="none" opacity="0.5" />
        <circle cx="7" cy="7" r="6.5" stroke="var(--border-strong)" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M2.5 1.5L10 6L2.5 10.5V1.5Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <rect x="1" y="1" width="8" height="8" rx="1" />
    </svg>
  );
}
