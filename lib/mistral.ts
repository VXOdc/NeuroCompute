import { DetectionResult } from "./types";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "pixtral-12b-2409";

const SYSTEM_PROMPT = `You are a precise visual analysis system. When given an image, respond ONLY with valid JSON — no markdown, no explanation, no preamble.

Return this exact structure:
{
  "scene": "One concise sentence describing the overall scene",
  "objects": [
    { "label": "object name", "detail": "brief qualifier if useful" }
  ],
  "confidence": "high" | "medium" | "low",
  "summary": "One sentence technical summary of what is visible"
}

Rules:
- List up to 8 objects maximum
- Keep labels short (1-3 words)
- confidence is high if scene is clear, medium if partially obscured, low if ambiguous or dark
- Never include markdown formatting
- Never include commentary outside the JSON`;

export async function analyzeFrame(
  base64Image: string,
  apiKey: string
): Promise<DetectionResult> {
  const startTime = Date.now();

  const response = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
            {
              type: "text",
              text: SYSTEM_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const processingTime = Date.now() - startTime;

  const rawContent = data.choices?.[0]?.message?.content ?? "";

  // Strip any accidental markdown fences
  const cleaned = rawContent.replace(/```json|```/g, "").trim();

  let parsed: Omit<DetectionResult, "timestamp" | "processingTime">;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback if model returns non-JSON
    parsed = {
      scene: "Unable to parse scene",
      objects: [],
      confidence: "low",
      summary: rawContent.slice(0, 120),
    };
  }

  return {
    ...parsed,
    timestamp: Date.now(),
    processingTime,
  };
}
