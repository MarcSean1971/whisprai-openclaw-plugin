function cleanText(value) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text || text === "NO_REPLY") return "";
  return text;
}

export function extractPayloadText(payloads) {
  if (!Array.isArray(payloads)) return "";
  return payloads
    .map((payload) => {
      if (typeof payload === "string") return payload;
      if (!payload || typeof payload !== "object") return "";
      if (payload.type && payload.type !== "text") return "";
      return payload.text || payload.content || payload.message || payload.body || "";
    })
    .map(cleanText)
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function extractFromObject(parsed) {
  if (!parsed || typeof parsed !== "object") return "";

  const payloadText = extractPayloadText(parsed.payloads) ||
    extractPayloadText(parsed.result?.payloads) ||
    extractPayloadText(parsed.reply?.payloads) ||
    extractPayloadText(parsed.message?.content);
  if (payloadText) return payloadText;

  const candidates = [
    parsed.text,
    parsed.message,
    parsed.reply,
    parsed.response,
    parsed.output,
    parsed.result?.text,
    parsed.result?.message,
    parsed.result?.reply,
    parsed.result?.response,
    parsed.result?.output,
    parsed.reply?.text,
    parsed.reply?.message,
    parsed.reply?.response,
    parsed.reply?.output,
    parsed.finalAssistantVisibleText,
    parsed.result?.meta?.finalAssistantVisibleText,
    parsed.result?.meta?.finalAssistantRawText,
  ];

  for (const candidate of candidates) {
    const text = cleanText(candidate);
    if (text) return text;
  }

  return "";
}

function extractFromJsonLines(raw) {
  const texts = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) continue;
    try {
      const text = extractFromObject(JSON.parse(trimmed));
      if (text) texts.push(text);
    } catch {
      // Ignore non-JSON diagnostic lines.
    }
  }
  return texts.at(-1) || "";
}

export function extractAgentText(stdout) {
  const raw = String(stdout || "").trim();
  if (!raw) return "";

  try {
    const text = extractFromObject(JSON.parse(raw));
    if (text) return text;
    return "";
  } catch {
    const fromLines = extractFromJsonLines(raw);
    if (fromLines) return fromLines;

    // Non-JSON stdout can still be a valid plain-text reply, but never relay
    // OpenClaw's internal silent-reply sentinel or raw JSON/JSONL metadata.
    if (raw === "NO_REPLY") return "";
    if (raw.startsWith("{") || raw.split(/\r?\n/).some((line) => line.trim().startsWith("{"))) return "";
    return raw;
  }
}
