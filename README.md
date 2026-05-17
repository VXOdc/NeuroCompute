# NeuroCompute

<p align="center">
  <img width="320" alt="NeuroCompute Logo" src="https://github.com/user-attachments/assets/d21ddf08-b3f9-441c-914e-88f92f33bc12" />
</p>

<p align="center">
  Real-time AI vision running directly in the browser.
</p>

---

## Overview

NeuroCompute is a browser-based AI vision system built with Next.js and Mistral AI.  
It captures live webcam frames, sends them through the `pixtral-12b-2409` vision model, and returns structured scene analysis in real time.

Instead of focusing on traditional computer vision or custom-trained models, this project focuses on building a responsive real-world perception pipeline that actually feels usable live.

The system can:
- describe scenes
- detect nearby objects
- estimate confidence levels
- provide contextual summaries
- read scenes aloud using voice synthesis

All directly from the browser.

---

## Pipeline

```txt
Camera Feed
    ↓
Frame Capture
    ↓
Adaptive JPEG Compression
    ↓
POST /api/detect
    ↓
Mistral Pixtral Vision Model
    ↓
Structured Scene Analysis
    ↓
Live UI + Metrics + Voice Output
```

---

# Features

### Real-time scene understanding
Captures webcam frames at a configurable interval and analyzes them using Mistral's multimodal vision model.

### Structured detections
Each response includes:
- scene description
- detected objects
- confidence ratings
- contextual summaries
- optional actionable insights

### Adaptive compression system
Frame quality automatically adjusts based on rolling API latency to reduce payload size and keep the pipeline responsive.

### Concurrent request protection
A `processingRef` guard prevents overlapping API calls during slower network conditions.

### Detection history
Stores recent detections locally and allows previous results to be restored instantly.

### Voice playback
Scene descriptions can be spoken aloud through the browser using the Web Speech API.

### Live performance metrics
Tracks:
- API latency
- rolling average latency
- frame interval
- estimated FPS
- processed frame count

### Keyboard shortcuts
Quick controls for:
- pipeline start / stop
- interval switching
- speech playback

### Theme support
Dark, light, and system themes using `next-themes`.

---

# Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| AI Model | Mistral `pixtral-12b-2409` |
| Styling | CSS Custom Properties |
| Fonts | DM Sans + DM Mono |
| Camera Access | MediaDevices API |
| Voice Output | Web Speech API |
| State Management | React Hooks + Refs |
| Deployment | Vercel |

---

# Performance Design

One of the main goals of this project was making the pipeline stable during continuous real-time use instead of just making a short AI demo.

### Adaptive image quality
Image compression changes dynamically depending on average API latency:
- low latency → higher image quality
- high latency → smaller payloads

This helps maintain stable response times under load.

### Non-blocking request loop
The detection loop runs on a fixed interval, but frames are skipped if a previous request is still processing. This prevents request pileups and unnecessary memory usage.

### Retry handling
Failures are tracked using refs instead of React state to avoid unnecessary rerenders and interval recreation during recovery.

---

# Project Structure

```bash
NeuroCompute/
├── app/
│   ├── api/
│   │   └── detect/
│   │       └── route.ts
│   ├── globals.css
│   ├── icon.svg
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── Camera.tsx
│   ├── Overlay.tsx
│   └── SettingsMenu.tsx
│
├── lib/
│   ├── imageUtils.ts
│   ├── mistral.ts
│   └── types.ts
│
└── public/
    └── logo.svg
```

---

# Getting Started

## Prerequisites

- Node.js 18+
- Mistral AI API key
- Webcam-enabled device

---

## Installation

```bash
git clone https://github.com/your-username/neurocompute.git

cd neurocompute

npm install
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
MISTRAL_API_KEY=your_api_key_here
```

The API key is handled server-side and is never exposed to the client.

---

## Run Locally

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Allow camera permissions and start the pipeline.

---

# How It Works

## Frame Capture

`Camera.tsx` initializes a webcam feed using `getUserMedia()` and exposes a `captureFrame()` method through a React ref.

Frames are drawn onto a hidden `<canvas>` and exported as compressed JPEG images.

---

## Detection Pipeline

`page.tsx` runs a timed processing loop:

1. Checks if another request is already running
2. Captures a webcam frame
3. Compresses the image based on latency
4. Sends the frame to `/api/detect`
5. Calls the Mistral vision model
6. Parses structured JSON results
7. Updates the UI and metrics panels

---

## Adaptive Compression

`adaptiveQuality(avgLatency)` dynamically changes JPEG quality between `0.5` and `0.85`.

As latency increases:
- payload size decreases
- response speed improves
- frame throughput stabilizes

---

# Configuration

| Setting | Default |
|---|---|
| Sampling Interval | 500 ms |
| History Length | 8 Results |
| Max Objects | 7 |
| Max Payload Size | 400 KB |
| Voice Output | Off |
| Theme | Dark |

---

# Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Start / Stop Pipeline |
| `1` | Set 300ms Interval |
| `2` | Set 500ms Interval |
| `3` | Set 700ms Interval |
| `S` | Speak Current Scene |

---

# API

## `POST /api/detect`

Accepts a base64 image and returns structured scene analysis.

### Request

```json
{
  "image": "<base64-image>"
}
```

---

### Success Response

```json
{
  "success": true,
  "data": {
    "scene": "Person sitting at a desk using a laptop",
    "objects": [
      {
        "label": "laptop",
        "detail": "open on desk",
        "confidence": "high"
      }
    ],
    "confidence": "high",
    "summary": "Indoor workspace environment",
    "processingTime": 1240
  }
}
```

---

### Error Response

```json
{
  "success": false,
  "error": "Image payload too large"
}
```

---

# Future Improvements

- object bounding boxes
- streamed responses
- multi-frame memory
- local inference support
- WebRTC streaming
- spatial tracking
- multi-camera support

---

# Why I Built This

I wanted to see how far modern multimodal AI could go inside a normal browser environment without building a massive infrastructure stack or training custom models.

A lot of AI demos look impressive for a minute, but start breaking once you run them continuously in real time.

This project was mainly about building something that feels stable, responsive, and engineered like a real system instead of just another AI showcase.

---

# License

MIT License
