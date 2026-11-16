const MAX_FILE_SIZE = 100 * 1024 * 1024;

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, {error:"Método não permitido."});
  }
  if (!process.env.GEMINI_API_KEY) {
    return send(res, 503, {error:"Falta configurar a chave da IA no servidor."});
  }
  try {
    const {name, mimeType, size} = req.body || {};
    const allowed = typeof mimeType === "string" && (mimeType.startsWith("image/") || mimeType === "application/pdf");
    if (!allowed) return send(res, 400, {error:"Este envio aceita imagens e PDFs."});
    if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
      return send(res, 413, {error:"Cada imagem ou PDF pode ter no máximo 100 MB."});
    }
    const response = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "x-goog-api-key":process.env.GEMINI_API_KEY,
        "X-Goog-Upload-Protocol":"resumable",
        "X-Goog-Upload-Command":"start",
        "X-Goog-Upload-Header-Content-Length":String(size),
        "X-Goog-Upload-Header-Content-Type":mimeType
      },
      body:JSON.stringify({file:{display_name:String(name || "aurix-upload").slice(0,200)}})
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Gemini upload initialization failed:", response.status, detail.slice(0,500));
      return send(res, 502, {error:"O serviço de arquivos não aceitou iniciar o envio. Tente novamente."});
    }
    const uploadUrl = response.headers.get("x-goog-upload-url");
    if (!uploadUrl) return send(res, 502, {error:"O serviço não retornou o endereço seguro de envio."});
    return send(res, 200, {uploadUrl});
  } catch (error) {
    console.error("Upload init error:", error);
    return send(res, 502, {error:"Não foi possível iniciar o envio do arquivo."});
  }
}
