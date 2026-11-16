const $ = (id) => document.getElementById(id);
const input = $("messageInput");
const messages = $("messages");
const welcome = $("welcome");
const fileInput = $("fileInput");
let attachments = [];
let sending = false;
let activeConversationId = Date.now();
let conversations = [];
try { conversations = JSON.parse(localStorage.getItem("aurix-history") || "[]"); } catch { conversations = []; }

function saveHistory() {
  try { localStorage.setItem("aurix-history", JSON.stringify(conversations.slice(0, 30))); } catch {}
  renderHistory();
}
function renderHistory() {
  const list = $("historyList");
  list.innerHTML = "";
  if (!conversations.length) {
    const empty = document.createElement("span");
    empty.className = "empty-history";
    empty.textContent = "Suas conversas aparecerão aqui.";
    list.append(empty);
    return;
  }
  conversations.forEach((item, index) => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.textContent = item.title;
    button.addEventListener("click", () => loadConversation(index));
    list.append(button);
  });
}
function addMessage(role, text, files = []) {
  welcome.hidden = true;
  const row = document.createElement("article");
  row.className = "message " + role;
  if (role === "assistant") {
    const badge = document.createElement("div");
    badge.className = "message-badge";
    badge.textContent = "A";
    row.append(badge);
  }
  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;
  files.forEach(file => {
    const chip = document.createElement("span");
    chip.className = "file-chip";
    chip.textContent = "📎 " + file.name;
    content.append(document.createElement("br"), chip);
  });
  row.append(content);
  messages.append(row);
  window.scrollTo({top: document.body.scrollHeight, behavior:"smooth"});
  return content;
}
function showTyping() {
  const row = document.createElement("article");
  row.className = "message assistant";
  row.id = "typingIndicator";
  const badge = document.createElement("div");
  badge.className = "message-badge";
  badge.textContent = "A";
  const content = document.createElement("div");
  content.className = "message-content typing";
  content.textContent = "AURIX está pensando…";
  row.append(badge, content);
  messages.append(row);
  window.scrollTo({top: document.body.scrollHeight, behavior:"smooth"});
}
function fileToPart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo " + file.name));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve({ inlineData: { mimeType: file.type, data: result.split(",")[1] || "" } });
    };
    reader.readAsDataURL(file);
  });
}
async function buildUserParts(text, files) {
  const parts = [];
  if (text) parts.push({text});
  for (const file of files) {
    if (file.size > 3 * 1024 * 1024) throw new Error(file.name + " ultrapassa o limite de 3 MB.");
    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      parts.push(await fileToPart(file));
    } else if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
      const content = await file.text();
      parts.push({text: "\n\nConteúdo do arquivo " + file.name + ":\n" + content.slice(0, 20000)});
    } else {
      throw new Error("Formato não suportado: " + file.name + ". Envie imagens, PDF ou TXT.");
    }
  }
  return parts;
}
function getCurrentConversation(title) {
  let current = conversations.find(c => c.id === activeConversationId);
  if (!current) {
    current = {id: activeConversationId, title: (title || "Nova conversa").slice(0, 42), messages: []};
    conversations.unshift(current);
  }
  return current;
}
async function sendMessage(text = input.value.trim()) {
  if (sending || (!text && !attachments.length)) return;
  const files = [...attachments];
  const visibleText = text || "Analise o(s) arquivo(s) anexado(s).";
  sending = true;
  $("sendButton").disabled = true;
  input.disabled = true;
  addMessage("user", visibleText, files);
  const current = getCurrentConversation(visibleText || files[0]?.name);
  try {
    const parts = await buildUserParts(text, files);
    const history = current.messages.filter(m => m.role === "user" || m.role === "model").slice(-15);
    history.push({role:"user", parts});
    input.value = "";
    input.style.height = "auto";
    attachments = [];
    $("attachmentList").textContent = "";
    showTyping();

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({messages: history})
    });
    const result = await response.json().catch(() => ({}));
    $("typingIndicator")?.remove();
    if (!response.ok) throw new Error(result.error || "Não foi possível conectar à AURIX agora.");
    const answer = String(result.answer || "").trim();
    addMessage("assistant", answer);
    current.messages.push({role:"user", parts:[{text:visibleText}], text:visibleText, files:files.map(f=>({name:f.name}))});
    current.messages.push({role:"model", parts:[{text:answer}], text:answer});
    saveHistory();
  } catch (error) {
    $("typingIndicator")?.remove();
    addMessage("assistant", error.message || "Ocorreu um erro inesperado. Tente novamente.");
    input.value = text;
    attachments = files;
    $("attachmentList").textContent = attachments.map(f => "📎 " + f.name).join("  ·  ");
  } finally {
    sending = false;
    $("sendButton").disabled = false;
    input.disabled = false;
    input.focus();
  }
}
function newChat() {
  activeConversationId = Date.now();
  messages.innerHTML = "";
  welcome.hidden = false;
  input.value = "";
  attachments = [];
  $("attachmentList").textContent = "";
  closePanel();
}
function loadConversation(index) {
  const item = conversations[index];
  if (!item) return;
  activeConversationId = item.id;
  messages.innerHTML = "";
  welcome.hidden = true;
  item.messages.forEach(m => addMessage(m.role === "model" ? "assistant" : "user", m.text || "", m.files || []));
  closePanel();
}
function openPanel() {
  $("sidePanel").classList.add("open");
  $("sidePanel").setAttribute("aria-hidden","false");
  $("scrim").classList.add("show");
}
function closePanel() {
  $("sidePanel").classList.remove("open");
  $("sidePanel").setAttribute("aria-hidden","true");
  $("scrim").classList.remove("show");
}
$("sendButton").addEventListener("click", () => sendMessage());
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 150) + "px";
});
$("attachButton").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const selected = [...fileInput.files];
  attachments = [...attachments, ...selected];
  $("attachmentList").textContent = attachments.map(f => "📎 " + f.name).join("  ·  ");
  fileInput.value = "";
});
$("voiceButton").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert("Ditado por voz não está disponível neste navegador."); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.onresult = event => { input.value += (input.value ? " " : "") + event.results[0][0].transcript; input.focus(); };
  recognition.start();
});
$("menuButton").addEventListener("click", openPanel);
$("closePanel").addEventListener("click", closePanel);
$("scrim").addEventListener("click", closePanel);
$("newChatButton").addEventListener("click", newChat);
$("panelNewChat").addEventListener("click", newChat);
document.querySelectorAll(".suggestion").forEach(button => button.addEventListener("click", () => { input.value = button.dataset.prompt; sendMessage(); }));
renderHistory();
fetch("/api/chat").then(r => r.json()).then(s => {
  if (s.ok && !s.configured) $("composerNote")?.replaceChildren(document.createTextNode("AURIX: falta configurar a chave gratuita do modelo no servidor."));
}).catch(()=>{});
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(()=>{}));
