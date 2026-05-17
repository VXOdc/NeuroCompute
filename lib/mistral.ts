import { DetectionResult } from "./types";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "pixtral-12b-2409";

// Improved prompt: more specific labels, spatial awareness, actionable insights,
// and per-object confidence. Rules explicitly forbid markdown and hallucination.
const SYSTEM_PROMPT = `You are NeuroCompute — a precise, real-time visual intelligence system for technical users.

Analyze the image and respond with valid JSON only using this exact structure:

{
  "scene": "One concise, descriptive sentence of the overall scene",
  "objects": [
    {
      "label": "short specific name (2-4 words max)",
      "detail": "brief useful qualifier or spatial context",
      "confidence": "high|medium|low"
    }
  ],
  "confidence": "high|medium|low",
  "summary": "One technical sentence summarizing what is visible and notable",
  "actionable": "Short practical insight if genuinely relevant, e.g. 'person appears focused on screen'"
}

Rules:
- Maximum 7 objects
- Be extremely specific ("red coffee mug" not "cup", "laptop on desk" not "device")
- Include spatial relationships when obvious ("book beside keyboard")
- confidence is high if scene is clear, medium if partially obscured, low if ambiguous or dark
- Only include "actionable" if there is a genuinely useful observation — omit the field otherwise
- Never hallucinate objects that are not clearly visible
- Never add explanations, markdown, code fences, or any text outside the JSON object`;

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
      // System message carries the format instructions so the model has full
      // attention on the visual when generating. User turn is image-only.
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
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

  // Strip any accidental markdown fences the model emits
  const cleaned = rawContent.replace(/```json|```/g, "").trim();

  let parsed: Omit<DetectionResult, "timestamp" | "processingTime">;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Graceful fallback — surface the raw text as the summary so the user
    // can see what the model actually returned rather than a silent failure.
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
