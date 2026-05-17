"use client";

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { captureFrame } from "@/lib/imageUtils";

export interface CameraHandle {
  // quality is optional — callers should derive it via adaptiveQuality()
  captureFrame: (quality?: number) => string | null;
}

interface CameraProps {
  onStatusChange?: (status: "idle" | "requesting" | "active" | "error") => void;
  onError?: (msg: string) => void;
}

const Camera = forwardRef<CameraHandle, CameraProps>(
  ({ onStatusChange, onError }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [ready, setReady] = useState(false);

    // BUG FIX 1:
    // Store the latest callbacks in refs so the camera useEffect can use []
    // as its dependency array. Previously [onStatusChange, onError] were in
    // the deps — both are inline arrow functions in page.tsx that get a new
    // reference on every render. This caused the effect to re-run on every
    // state update, stopping and restarting the MediaStream continuously.
    const onStatusChangeRef = useRef(onStatusChange);
    const onErrorRef = useRef(onError);
    useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    useImperativeHandle(ref, () => ({
      // quality defaults to 0.65 here too; page.tsx passes adaptive value
      captureFrame: (quality = 0.65) => {
        if (!videoRef.current) return null;
        return captureFrame(videoRef.current, quality);
      },
    }));

    useEffect(() => {
      let cancelled = false;

      async function startCamera() {
        onStatusChangeRef.current?.("requesting");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: false,
          });

          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;

            // BUG FIX 7:
            // Safari (desktop and iOS) and some Chromium variants under strict
            // autoplay policy won't honour the autoPlay HTML attribute when
            // srcObject is set programmatically. An explicit play() call ensures
            // cross-browser playback. NotAllowedError is swallowed gracefully —
            // the onCanPlay handler is the canonical "ready" signal.
            try {
              await videoRef.current.play();
            } catch {
              // Silently ignore: policy-blocked autoplay; onCanPlay handles ready state.
            }
          }
        } catch (err) {
          if (cancelled) return;
          const msg =
            err instanceof Error ? err.message : "Camera access denied";
          onStatusChangeRef.current?.("error");
          onErrorRef.current?.(msg);
        }
      }

      startCamera();

      return () => {
        cancelled = true;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      // Empty deps: runs once on mount. Callback refs above keep the latest
      // handlers accessible without re-triggering the effect.
    }, []);

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <video
          ref={videoRef}
          playsInline
          muted
          onCanPlay={() => {
            setReady(true);
            onStatusChangeRef.current?.("active");
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            borderRadius: "inherit",
            transform: "scaleX(-1)", // mirror so it feels like a selfie camera
          }}
        />
        {!ready && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-elevated)",
              borderRadius: "inherit",
            }}
          >
            <CameraPlaceholder />
          </div>
        )}
      </div>
    );
  }
);

Camera.displayName = "Camera";
export default Camera;

function CameraPlaceholder() {
  return (
    <div style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ marginBottom: "var(--space-3)", display: "block", margin: "0 auto var(--space-3)" }}
      >
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
      <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
        Initializing camera
      </span>
    </div>
  );
}
