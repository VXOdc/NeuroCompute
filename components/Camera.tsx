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
  captureFrame: () => string | null;
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

    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        if (!videoRef.current) return null;
        return captureFrame(videoRef.current);
      },
    }));

    useEffect(() => {
      let cancelled = false;

      async function startCamera() {
        onStatusChange?.("requesting");
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
          }
        } catch (err) {
          if (cancelled) return;
          const msg =
            err instanceof Error ? err.message : "Camera access denied";
          onStatusChange?.("error");
          onError?.(msg);
        }
      }

      startCamera();

      return () => {
        cancelled = true;
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
    }, [onStatusChange, onError]);

    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onCanPlay={() => {
            setReady(true);
            onStatusChange?.("active");
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            borderRadius: "inherit",
            transform: "scaleX(-1)", // mirror for natural UX
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
