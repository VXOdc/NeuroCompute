import { NextRequest, NextResponse } from "next/server";
import { analyzeFrame } from "@/lib/mistral";
import { ApiDetectResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest): Promise<NextResponse<ApiDetectResponse>> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "API key not configured" },
      { status: 500 }
    );
  }

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.image || typeof body.image !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing image field" },
      { status: 400 }
    );
  }

  // Basic size guard — reject frames over ~300KB base64
  if (body.image.length > 400_000) {
    return NextResponse.json(
      { success: false, error: "Image payload too large" },
      { status: 413 }
    );
  }

  try {
    const result = await analyzeFrame(body.image, apiKey);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
