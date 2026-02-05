/**
 * Google Cloud Vision API – API key ile REST çağrısı.
 * API key: Google Cloud Console > APIs & Services > Credentials > Create credentials > API key
 * .env içine GOOGLE_CLOUD_VISION_API_KEY=AIzaSy... ekle (Application Credentials / service account gerekmez).
 */
const VISION_ANNOTATE_URL = "https://vision.googleapis.com/v1/images:annotate";

function getApiKey(): string {
  const key = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_CLOUD_VISION_API_KEY is not set. Add it to .env (e.g. from Google Cloud Console > APIs & Services > Credentials > API key)."
    );
  }
  return key;
}

export type VisionFeatureType =
  | "TEXT_DETECTION"
  | "LOGO_DETECTION"
  | "IMAGE_PROPERTIES";

interface VisionAnnotateResponse {
  responses: Array<{
    fullTextAnnotation?: { text?: string; pages?: unknown[] };
    textAnnotations?: Array<{ description?: string; boundingPoly?: unknown }>;
    logoAnnotations?: Array<{
      description?: string;
      score?: number;
      boundingPoly?: unknown;
    }>;
    imagePropertiesAnnotation?: {
      dominantColors?: { colors?: Array<{ color?: unknown; score?: number; pixelFraction?: number }> };
    };
    error?: { code?: number; message?: string };
  }>;
}

/**
 * Vision API REST çağrısı – tek feature type (TEXT_DETECTION, LOGO_DETECTION, IMAGE_PROPERTIES).
 * Görsel base64 olarak verilir.
 */
export async function visionAnnotate(
  base64Content: string,
  featureType: VisionFeatureType
): Promise<VisionAnnotateResponse["responses"][0]> {
  const key = getApiKey();
  const res = await fetch(`${VISION_ANNOTATE_URL}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64Content },
          features: [{ type: featureType }],
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vision API HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as VisionAnnotateResponse;
  const first = data.responses?.[0];
  if (!first) {
    throw new Error("Vision API returned no response");
  }
  return first;
}

/**
 * Görseli URL'den çekip base64 döndürür (Vision API için).
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}
