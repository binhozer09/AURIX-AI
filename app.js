const $ = (id) => document.getElementById(id);
const input = $("messageInput");
const messages = $("messages");
const welcome = $("welcome");
const fileInput = $("fileInput");
let attachments = [];
let conversations = JSON.parse(localStorage.getItem("aurix-history") || "[]");

function saveHistory() {
  localStorage.setItem("aurix-history", JSON.stringify(conversations.slice(0, 30)));
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
}
function sendMessage(text = input.value.trim()) {
  if (!text && !attachments.length) return;
  const files = [...attachments];
  addMessage("user", text || "Arquivo enviado", files);
  if (!conversations.length || conversations[0].id !== activeConversationId) {
    conversations.unshift({id: activeConversationId, title: (text || files[0]?.name || "Nova conversa").slice(0, 42), messages: []});
  }
  const current = conversations.find(c => c.id === activeConversationId);
  if (current) current.messages.push({role:"user", text, files:files.map(f=>({name:f.name}))});
  saveHistory();
  input.value = "";
  input.style.height = "auto";
  attachments = [];
  $("attachmentList").textContent = "";
  addMessage("assistant", "A interface da AURIX AI já está funcionando! O motor de inteligência artificial ainda não foi conectado. Estamos preparando essa integração com uma opção gratuita, sem ativar serviços pagos ou cobranças.");
  if (current) current.messages.push({role:"assistant", text:"A interface da AURIX AI já está funcionando! O motor de inteligência artificial ainda não foi conectado. Estamos preparando essa integração com uma opção gratuita, sem ativar serviços pagos ou cobranças."});
  saveHistory();
}
let activeConversationId = Date.now();
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
  item.messages.forEach(m => addMessage(m.role, m.text));
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
  attachments = [...attachments, ...fileInput.files];
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
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(()=>{}));