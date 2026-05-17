/**
 * Captures a frame from a video element and returns a compressed base64 JPEG.
 */
export function captureFrame(
  video: HTMLVideoElement,
  quality = 0.65,
  maxWidth = 640
): string | null {
  if (video.readyState < 2) return null;

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = video.videoWidth * scale;
  canvas.height = video.videoHeight * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Strip the data URL prefix, return only base64 data
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1];
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
