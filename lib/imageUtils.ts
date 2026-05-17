/**
 * Returns an adaptive JPEG quality value (0–1) based on recent average API latency.
 * High latency → lower quality to reduce payload size and speed up round-trips.
 *
 * Thresholds (tuned for Mistral Pixtral-12B typical latency profile):
 *   > 2000 ms → 0.45  (aggressive compression)
 *   > 1500 ms → 0.55  (moderate compression)
 *   ≤ 1500 ms → 0.65  (default quality, good detail)
 */
export function adaptiveQuality(avgLatencyMs: number): number {
  if (avgLatencyMs > 2000) return 0.45;
  if (avgLatencyMs > 1500) return 0.55;
  return 0.65;
}

/**
 * Captures a frame from a video element and returns a compressed base64 JPEG.
 * quality defaults to 0.65; callers should use adaptiveQuality() to compute it.
 */
export function captureFrame(
  video: HTMLVideoElement,
  quality = 0.65,
  maxWidth = 640
): string | null {
  if (video.readyState < 2) return null;

  // BUG FIX 6: readyState >= 2 is necessary but not sufficient.
  // In Firefox and Safari the video can reach HAVE_CURRENT_DATA while
  // videoWidth / videoHeight are still 0. Without this guard:
  //   scale = Math.min(1, 640 / 0) → Infinity
  //   canvas.width = 0 * Infinity → NaN
  // ctx.drawImage on a NaN-sized canvas produces a corrupt frame.
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Strip the data URL prefix — return only the raw base64 payload
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1] ?? null;
}

/**
 * Estimates file size in KB from a base64 string.
 */
export function estimateBase64SizeKb(base64: string): number {
  return Math.round((base64.length * 3) / 4 / 1024);
}

/**
 * Format milliseconds into a readable latency string.
 */
export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format a Unix timestamp into a short HH:MM:SS string.
 */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
