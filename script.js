/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // Read and trim user input
  const text = userInput.value.trim();
  if (!text) return;

  // Append user's message
  appendMessage("user", text);
  userInput.value = "";

  // Disable input while fetching
  userInput.disabled = true;
  // Determine worker URL — allow an override from secrets.js if present
  const workerUrl =
    (window.__SECRETS &&
      window.__SECRETS.getWorkerUrl &&
      window.__SECRETS.getWorkerUrl()) ||
    "https://lorealchatbot.sherreo99.workers.dev/";
 

  // Show a loading message (assistant reply will appear below the latest question)
  const loading = appendMessage("ai", "…thinking");

  // Build messages array for Chat Completions API
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful assistant specialized in L'Oréal products, routines, and beauty recommendations. Only answer questions that are directly related to L'Oréal products, skincare, makeup, haircare, fragrances, product usage, ingredients, or personalized beauty routines and recommendations. If a user asks about topics unrelated to beauty or L'Oréal (e.g., politics, legal or medical diagnoses, finance, or other non-beauty subjects), politely refuse and say you can only help with L'Oréal and beauty-related questions. For health or medical concerns, suggest consulting a qualified professional. Keep responses friendly, concise, and focused on helping the user find the best L'Oréal products or routines.",
    },
    { role: "user", content: text },
  ];

  // Send to worker and handle response
  fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", messages }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Worker error (${res.status}): ${txt}`);
      }
      return res.json();
    })
    .then((data) => {
      const assistantText =
        data?.choices?.[0]?.message?.content ||
        "Sorry — no response from assistant.";
      loading.textContent = assistantText;
      chatWindow.scrollTop = chatWindow.scrollHeight;
    })
    .catch((err) => {
      console.error(err);
      loading.textContent = "Error: could not get response. Check console.";
    })
    .finally(() => {
      userInput.disabled = false;
      userInput.focus();
    });
});

/**
 * Append a chat message to the window.
 * Returns the created element for further updates.
 */
function appendMessage(role, text) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return el;
}
