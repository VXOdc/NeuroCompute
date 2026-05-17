# NeuroCompute

**Real-time AI vision system for the browser.** NeuroCompute streams frames from your webcam to Mistral's `pixtral-12b` vision model and renders scene descriptions, detected objects, and actionable insights — all in a live, low-latency pipeline.

```
Camera → Frame capture → /api/detect → Mistral Pixtral → Scene + Objects + Summary
```

---

## Features

- **Live scene analysis** — captures JPEG frames from your webcam at a configurable interval and sends them through a vision pipeline powered by Mistral AI
- **Structured detections** — each result returns a scene description, up to 7 labelled objects with spatial context, an overall confidence rating, and an optional actionable insight
- **Per-object confidence** — each detected object is rated `high`, `medium`, or `low` confidence, shown as a colour-coded dot
- **Adaptive quality** — JPEG compression automatically tightens as API latency rises, shrinking payloads to keep round-trips fast
- **Concurrent request guard** — the interval fires every N ms regardless of network speed; a `processingRef` flag skips a tick if the previous call is still in-flight, preventing request pile-ups
- **Detection history** — last 8 results are kept in a scrollable panel; click any row to reload that result as the current view
- **Voice output** — toggle "Speak Scene" to hear the scene description read aloud via the Web Speech API; press `S` to speak on demand
- **Performance metrics** — live panel showing current latency, rolling average, API response time, frame interval, estimated FPS, and total frames processed
- **Keyboard shortcuts** — `Space` toggle pipeline · `1` / `2` / `3` set sampling interval · `S` speak current scene
- **Theme switcher** — dark / light / system via `next-themes`, with a smooth CSS transition

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Vision model | Mistral `pixtral-12b-2409` |
| Styling | CSS custom properties (no CSS-in-JS library) |
| Fonts | DM Sans + DM Mono (Google Fonts) |
| Theming | next-themes |
| Voice | Web Speech API (browser native) |
| Camera | MediaDevices `getUserMedia` |

---

## Project structure

```
NeuroCompute/
├── app/
│   ├── api/
│   │   └── detect/
│   │       └── route.ts        # POST handler — validates request, calls Mistral
│   ├── globals.css             # Design tokens, dark/light themes, typography
│   ├── icon.svg                # Favicon (auto-detected by Next.js App Router)
│   ├── layout.tsx              # Root layout, metadata, ThemeProvider
│   └── page.tsx                # Main UI — camera, pipeline control, results panels
├── components/
│   ├── Camera.tsx              # Webcam feed, getUserMedia, captureFrame()
│   ├── Overlay.tsx             # Scan-line overlay rendered over the camera viewport
│   └── SettingsMenu.tsx        # Theme selector dropdown
├── lib/
│   ├── imageUtils.ts           # adaptiveQuality(), formatLatency(), formatTime()
│   ├── mistral.ts              # analyzeFrame() — builds the Mistral API request
│   └── types.ts                # Shared TypeScript interfaces
└── public/
    └── logo.svg                # Full NeuroCompute wordmark
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A [Mistral AI](https://console.mistral.ai/) account and API key
- A webcam

### Installation

```bash
git clone https://github.com/your-username/neurocompute.git
cd neurocompute
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
MISTRAL_API_KEY=your_mistral_api_key_here
```

The API key is read server-side in `app/api/detect/route.ts` and never exposed to the client.

### Running locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Grant camera access when prompted, then click **Start Pipeline**.

### Production build

```bash
npm run build
npm start
```

---

## How it works

### Frame capture

`Camera.tsx` initialises a `<video>` element via `getUserMedia` and exposes a `captureFrame(quality)` method through a `useImperativeHandle` ref. It draws the current video frame onto a hidden `<canvas>` and exports it as a base64 JPEG at the requested quality level.

### Adaptive quality

`imageUtils.ts` exports `adaptiveQuality(avgLatency)` which maps rolling average API latency to a JPEG quality value between `0.5` and `0.85`. When latency is low the image is high-quality; as latency climbs, quality drops to reduce payload size and speed up subsequent round-trips.

### The detection pipeline

`page.tsx` runs a `setInterval` loop at the selected sampling interval (300 / 500 / 700 ms). Each tick calls `processFrame()`:

1. Checks `processingRef` — skips if a prior call is still awaiting a response
2. Captures a frame at the adaptive quality level
3. POSTs `{ image: base64 }` to `/api/detect`
4. The API route validates the payload (size-guards at 400 KB) then calls `analyzeFrame()` in `lib/mistral.ts`
5. `analyzeFrame()` sends the image to Mistral's `pixtral-12b-2409` model with a structured JSON-only system prompt
6. The response is parsed, timestamped, and returned to the client
7. `page.tsx` updates the result, metrics, and history state; speaks the scene if voice is enabled

### Error handling and retries

A `retryCountRef` (not state, to avoid re-creating the interval on each error) tracks consecutive failures. After 3 failures the API status pill turns red. A successful response resets the counter. Using a ref rather than state for the retry count was a deliberate fix: putting it in state would recreate `processFrame` via `useCallback`, which would trigger the interval `useEffect`, restarting the loop mid-recovery.

---

## Configuration

| Setting | Default | Options | How to change |
|---|---|---|---|
| Sampling interval | 500 ms | 300 ms / 500 ms / 700 ms | UI buttons or keys `1` `2` `3` |
| Voice output | Off | On / Off | UI toggle or key `S` |
| Theme | Dark | Dark / Light / System | Settings menu (top-right) |
| History length | 8 | — | `HISTORY_MAX` constant in `page.tsx` |
| Max objects | 7 | — | System prompt in `lib/mistral.ts` |
| Max payload size | 400 KB | — | Size guard in `app/api/detect/route.ts` |

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Start / stop the pipeline |
| `1` | Set sampling interval to 300 ms |
| `2` | Set sampling interval to 500 ms |
| `3` | Set sampling interval to 700 ms |
| `S` | Speak the current scene aloud |

---

## API reference

### `POST /api/detect`

Accepts a camera frame and returns a structured scene analysis.

**Request body**

```json
{
  "image": "<base64-encoded JPEG string>"
}
```

**Response (success)**

```json
{
  "success": true,
  "data": {
    "scene": "A person sitting at a desk with a laptop and coffee mug",
    "objects": [
      { "label": "laptop on desk", "detail": "screen facing camera", "confidence": "high" },
      { "label": "red coffee mug", "detail": "beside keyboard", "confidence": "high" }
    ],
    "confidence": "high",
    "summary": "Indoor office environment, single occupant focused on laptop work.",
    "actionable": "Person appears focused on screen",
    "timestamp": 1716000000000,
    "processingTime": 1240
  }
}
```

**Response (error)**

```json
{
  "success": false,
  "error": "Image payload too large"
}
```

**Status codes**

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Missing or invalid request body |
| 413 | Image payload exceeds 400 KB |

| 502 | Mistral API error |

---
MIT License 
