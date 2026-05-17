export interface DetectionResult {
  scene: string;
  objects: DetectedObject[];
  confidence: "high" | "medium" | "low";
  summary: string;
  timestamp: number;
  processingTime: number;
}

export interface DetectedObject {
  label: string;
  detail?: string;
}

export interface PerformanceMetrics {
  currentLatency: number;
  avgLatency: number;
  frameInterval: number;
  estimatedFps: number;
  apiResponseTime: number;
  lastInferenceAt: number | null;
  totalFrames: number;
}

export interface SystemStatus {
  camera: "idle" | "requesting" | "active" | "error";
  pipeline: "idle" | "processing" | "error";
  api: "idle" | "ok" | "error" | "retrying";
}

export type SamplingMode = 300 | 500 | 700;

export interface ApiDetectRequest {
  image: string; // base64 JPEG
}

export interface ApiDetectResponse {
  success: boolean;
  data?: DetectionResult;
  error?: string;
}
