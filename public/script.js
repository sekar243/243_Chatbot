const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Riwayat percakapan yang dikirim ke server
const messages = [];

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.classList.add("message", sender);
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

// Pesan pembuka
addMessage("Halo! Ada yang bisa saya bantu?", "bot");

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  messages.push({ role: "user", content: text });
  userInput.value = "";
  sendBtn.disabled = true;
  userInput.disabled = true;

  const botDiv = addMessage("...", "bot");
  let botText = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Gagal menghubungi server");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;

    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          finished = true;
          break;
        }

        try {
          // Server mengirim potongan teks sebagai string JSON
          botText += JSON.parse(data);
          botDiv.textContent = botText;
          chatBox.scrollTop = chatBox.scrollHeight;
        } catch (err) {
          console.error("Gagal parsing data:", err);
        }
      }
    }

    if (!botText) botDiv.textContent = "(Tidak ada balasan)";
    messages.push({ role: "assistant", content: botText });
  } catch (error) {
    console.error(error);
    botDiv.textContent = "Error: " + error.message;
    // Hapus pesan user terakhir dari riwayat agar tidak menggantung
    messages.pop();
  } finally {
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
});