# NeuroCompute

A browser-based real-time AI vision system. NeuroCompute captures webcam frames, forwards them to Mistral Vision, and returns structured scene understanding — objects, scene description, and confidence — directly in the browser.

**Live demo:** Deploy your own on Vercel in under 2 minutes.

---

## What it does

- Opens webcam in the browser via `getUserMedia`
- Captures compressed JPEG frames at a configurable interval (300ms / 500ms / 700ms)
- Sends frames to a stateless serverless API route
- Calls Mistral Vision (`pixtral-12b`) for scene interpretation
- Renders detected objects, scene summary, and confidence inline
- Tracks latency, FPS, API response time, and frame count in real time
- Handles API failures gracefully with last-known state persistence

## Architecture

```
Browser (Next.js)
  ↓ getUserMedia → compressed JPEG (base64)
  ↓ POST /api/detect
Vercel Serverless Function
  ↓ forward to Mistral Vision API
Mistral pixtral-12b
  ↓ JSON: scene, objects[], confidence, summary
Browser
  ↓ render overlay + metrics
  ↓ repeat after interval
```

**No database. No image storage. No video streaming. Fully stateless.**

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, React 18, TypeScript |
| API | Vercel Serverless Functions |
| AI | Mistral Vision (`pixtral-12b-2409`) |
| Deployment | Vercel |

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/neurocompute.git
cd neurocompute
npm install
```

### 2. Get a Mistral API key

1. Go to [console.mistral.ai](https://console.mistral.ai)
2. Create an account and generate an API key
3. Copy `.env.local.example` to `.env.local`

```bash
cp .env.local.example .env.local
```

4. Paste your key:

```
MISTRAL_API_KEY=your_key_here
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Allow camera access. Click **Start Pipeline**.

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel
```

When prompted, add `MISTRAL_API_KEY` as an environment variable.

### Option B — GitHub + Vercel Dashboard

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add environment variable: `MISTRAL_API_KEY` = your key
4. Deploy

---

## Sampling modes

| Mode | Interval | Use case |
|------|----------|----------|
| 300ms | ~3 FPS equivalent | Highest responsiveness, highest API usage |
| 500ms | ~2 FPS equivalent | Balanced — recommended default |
| 700ms | ~1.4 FPS equivalent | Lowest API load, slight lag |

Note: Mistral Vision API calls are billed per request. At 300ms intervals you make ~200 requests/minute. Start with 500ms or 700ms.

---

## Project structure

```
/app
  page.tsx              ← Main UI
  layout.tsx            ← Root layout + metadata
  globals.css           ← Design system variables
  /api/detect
    route.ts            ← Mistral API handler (stateless)

/components
  Camera.tsx            ← Webcam access + frame capture
  Overlay.tsx           ← AI results rendered over camera

/lib
  mistral.ts            ← Mistral Vision API wrapper
  imageUtils.ts         ← Frame compression + formatting
  types.ts              ← Shared TypeScript types
```

---

## API contract

`POST /api/detect`

**Request**
```json
{ "image": "<base64 JPEG string>" }
```

**Response (success)**
```json
{
  "success": true,
  "data": {
    "scene": "A person sitting at a desk with a laptop",
    "objects": [
      { "label": "person", "detail": "seated" },
      { "label": "laptop" },
      { "label": "desk" }
    ],
    "confidence": "high",
    "summary": "Indoor workspace with one person visible.",
    "timestamp": 1712345678901,
    "processingTime": 1240
  }
}
```

**Response (error)**
```json
{ "success": false, "error": "Mistral API error 429: rate limited" }
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MISTRAL_API_KEY` | Yes | Your Mistral API key from console.mistral.ai |

**Never expose this key client-side.** It is only read inside the serverless API route.

---

## License

MIT
