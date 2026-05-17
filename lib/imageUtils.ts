/**
 * Captures a frame from a video element and returns a compressed base64 JPEG.
 */
export function captureFrame(
  video: HTMLVideoElement,
  quality = 0.65,
  maxWidth = 640
): string | null {
  if (video.readyState < 2) return null;

  // BUG FIX 6:
  // readyState >= 2 is necessary but not sufficient. In some browsers
  // (notably Firefox and Safari) the video can reach HAVE_CURRENT_DATA while
  // videoWidth / videoHeight are still 0 — the frame data hasn't been
  // decoded yet. Without this guard:
  //   scale = Math.min(1, 640 / 0) → Infinity
  //   canvas.width = 0 * Infinity → NaN
  // ctx.drawImage on a NaN-sized canvas produces a corrupt or empty frame
  // that gets sent to the API as a broken payload.
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Strip the data URL prefix, return only base64 data
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
 * Format a timestamp into a short time string.
 */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
