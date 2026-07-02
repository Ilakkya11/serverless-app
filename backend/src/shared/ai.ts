type Provider = "openai" | "gemini";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function postJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`AI provider request failed: ${response.status} ${message}`);
  }
  return (await response.json()) as T;
}

async function callOpenAi(messages: ChatMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (process.env.LOCAL_DEV === "true") {
      return `Local AI fallback: ${messages[messages.length - 1]?.content.slice(0, 400) ?? ""}`;
    }
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const payload = await postJson<{
    choices: Array<{ message: { content: string } }>;
  }>("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages
    })
  });

  return payload.choices[0]?.message.content ?? "";
}

async function callGemini(messages: ChatMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (process.env.LOCAL_DEV === "true") {
      return `Local AI fallback: ${messages[messages.length - 1]?.content.slice(0, 400) ?? ""}`;
    }
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const prompt = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
  const payload = await postJson<{
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  }>(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    })
  });

  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

export async function generateAiText(prompt: string, system = "You are a helpful placement preparation AI assistant.") {
  const provider = (process.env.AI_PROVIDER || "openai") as Provider;
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: prompt }
  ];

  return provider === "gemini" ? callGemini(messages) : callOpenAi(messages);
}

export async function generateAiJson<T>(prompt: string, system: string): Promise<T> {
  const response = await generateAiText(
    `${prompt}\n\nReturn strict JSON only with double-quoted keys and no markdown fences.`,
    system
  );

  const normalized = response.replace(/```json|```/g, "").trim();
  return JSON.parse(normalized) as T;
}
