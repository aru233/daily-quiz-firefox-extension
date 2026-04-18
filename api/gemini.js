/**
 * Google Gemini API client.
 * Docs: https://ai.google.dev/api/generate-content
 */

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function generateContent(apiKey, prompt, model = "gemini-3-flash-preview", options = {}) {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.8,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      ...(options.generationConfig ?? {}),
      // maxOutputTokens must win over any generationConfig spread
      maxOutputTokens: options.maxOutputTokens ?? 4096,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = err?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Gemini API error: ${message}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    throw new Error("Gemini response was cut off (MAX_TOKENS). Try a shorter prompt or fewer questions.");
  }
  const text = candidate?.content?.parts?.[0]?.text;
  if (text == null) {
    throw new Error("Unexpected Gemini response shape — no text found.");
  }
  return text;
}
