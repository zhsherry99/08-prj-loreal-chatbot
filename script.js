/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

// Conversation state (persists while the page is open)
const conversation = [];
const userProfile = {};

// Initialize system prompt once and keep it at conversation[0]
const systemPrompt =
  "You are a helpful assistant specialized in L'Oréal products, routines, and beauty recommendations. Only answer questions that are directly related to L'Oréal products, skincare, makeup, haircare, fragrances, product usage, ingredients, or personalized beauty routines and recommendations. If a user asks about topics unrelated to beauty or L'Oréal (e.g., politics, legal or medical diagnoses, finance, or other non-beauty subjects), politely refuse and say you can only help with L'Oréal and beauty-related questions. For health or medical concerns, suggest consulting a qualified professional. Keep responses friendly, concise, and focused on helping the user find the best L'Oréal products or routines.";

conversation.push({ role: "system", content: systemPrompt });

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

  // Detect and save simple user profile info (e.g., name) from natural input
  // Patterns: "my name is X", "I'm X", "I am X" (case-insensitive)
  const nameMatch = text.match(
    /\b(?:my name is|i am|i'm)\s+([A-Za-z][A-Za-z\-\' ]{0,40})/i
  );
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim();
    if (
      !userProfile.name ||
      userProfile.name.toLowerCase() !== name.toLowerCase()
    ) {
      userProfile.name = name;
      // Add a short system note so the assistant can use the name in subsequent turns
      conversation.push({
        role: "system",
        content: `The user's name is ${name}. Address them by their name.`,
      });
      // (Optional) update header greeting
      const titleEl = document.querySelector(".site-title");
      if (titleEl) titleEl.textContent = `Smart Product Advisor — Hi, ${name}`;
    }
  }

  // Append user's message to the conversation history
  conversation.push({ role: "user", content: text });

  // Keep conversation length bounded to avoid very long histories (keep system + last 18 messages)
  const MAX_MESSAGES = 20; // includes system message
  while (conversation.length > MAX_MESSAGES) {
    // preserve the system message at index 0
    conversation.splice(1, 1);
  }

  // Send the entire conversation array (including system + past messages) to the worker
  fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", messages: conversation }),
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
      // Replace the loading element text with the assistant response
      loading.textContent = assistantText;
      // Store assistant reply in conversation for future turns
      conversation.push({ role: "assistant", content: assistantText });
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
