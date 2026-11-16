const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const MAX_MESSAGES = 16;
const MAX_TEXT = 20000;
const MAX_PARTS = 8;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const buckets = new Map();

const SYSTEM_INSTRUCTION = `Você é a AURIX AI, uma assistente de inteligência artificial útil, clara, cuidadosa e competente. Responda em português do Brasil quando o usuário escrever em português. Entenda o contexto da conversa, raciocine com cuidado, explique passo a passo quando isso ajudar e seja honesta sobre incertezas. Não invente fatos, fontes, resultados de ferramentas ou ações que não realizou. Ajude com escrita, estudos, programação, análise de documentos e imagens, planejamento e ideias. Não diga que é ChatGPT nem finja ser um modelo da OpenAI: sua identidade é AURIX AI. Seja acolhedora sem exagerar. Se o usuário pedir algo atual que você não pode verificar, deixe clara a limitação.`;

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(payload));
}

function allowedRequest(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || "unknown").split(",")[0]).trim();
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || now - current.start >= WINDOW_MS) {
    buckets.set(ip, { start: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_REQUESTS_PER_WINDOW;
}

function cleanMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) throw new Error("Envie uma mensagem para começar.");
  return messages.slice(-MAX_MESSAGES).map((message) => {
    const role = message && message.role === "model" ? "model" : "user";
    if (!Array.isArray(message.parts) || message.parts.length === 0 || message.parts.length > MAX_PARTS) {
      throw new Error("Formato de mensagem inválido.");
    }
    const parts = message.parts.map((part) => {
      if (typeof part.text === "string") {
        if (part.text.length > MAX_TEXT) throw new Error("A mensagem está muito grande. Divida o conteúdo em partes menores.");
        return { text: part.text };
      }
      const inline = part.inlineData;
      if (inline && typeof inline.data === "string" && typeof inline.mimeType === "string") {
        const allowed = inline.mimeType.startsWith("image/") || inline.mimeType === "application/pdf";
        if (!allowed || inline.data.length > 4_200_000) throw new Error("Anexo não suportado ou muito grande. Use imagens ou PDF de até 3 MB.");
        return { inlineData: { mimeType: inline.mimeType, data: inline.data } };
      }
      throw new Error("Parte da mensagem inválida.");
    });
    return { role, parts };
  });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return send(res, 200, { ok: true, configured: Boolean(process.env.GEMINI_API_KEY), model: MODEL });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "Método não permitido." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return send(res, 503, { error: "A AURIX está quase pronta. Falta configurar a chave gratuita do modelo no servidor." });
  }
  if (!allowedRequest(req)) {
    return send(res, 429, { error: "Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente." });
  }

  try {
    const messages = cleanMessages(req.body && req.body.messages);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: messages,
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
        })
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 429) return send(res, 429, { error: "O limite gratuito do modelo foi atingido por enquanto. Aguarde a renovação da cota e tente novamente." });
      if (response.status === 401 || response.status === 403) return send(res, 502, { error: "A chave do modelo foi recusada. Confira a configuração GEMINI_API_KEY no servidor." });
      console.error("Gemini API error:", response.status, data && data.error && data.error.message);
      return send(res, 502, { error: "O modelo não conseguiu responder agora. Tente novamente em instantes." });
    }

    const answer = (data.candidates || [])
      .flatMap(candidate => candidate.content && candidate.content.parts ? candidate.content.parts : [])
      .map(part => typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();

    if (!answer) return send(res, 502, { error: "O modelo retornou uma resposta vazia. Tente reformular sua pergunta." });
    return send(res, 200, { answer, model: MODEL });
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : "Não foi possível processar a mensagem." });
  }
}
