const PLACEHOLDER_MARKERS = ["YOUR_OPENAI", "sk-your", "xxx"];

function isPlaceholder(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;
  return PLACEHOLDER_MARKERS.some((marker) =>
    normalized.toLowerCase().includes(marker.toLowerCase()),
  );
}

export function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY ?? "";
}

export function getOpenAiVisionModel() {
  return process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
}

export function isOpenAiConfigured() {
  const key = getOpenAiApiKey().trim();
  return Boolean(key && !isPlaceholder(key));
}
