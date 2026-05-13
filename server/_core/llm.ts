/**
 * LLM wrapper — appelle l'API Anthropic directement (Claude).
 * Remplace l'ancienne dépendance à forge.manus.im qui n'est accessible
 * que dans l'environnement Manus.
 *
 * Variables d'env nécessaires :
 *   ANTHROPIC_API_KEY  — clé API Anthropic
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_VERSION = "2023-06-01";

export type Role = "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type InvokeParams = {
  messages: Message[];
  maxTokens?: number;
  max_tokens?: number;
  system?: string;
};

export type InvokeResult = {
  id: string;
  content: Array<{ type: "text"; text: string }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  // Compatibility shim so existing code using choices[0].message.content keeps working
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const maxTokens = params.maxTokens ?? params.max_tokens ?? 1024;

  // Separate system message if provided as a system role message
  let systemPrompt = params.system;
  const userMessages: Message[] = [];

  for (const msg of params.messages) {
    if ((msg.role as string) === "system") {
      systemPrompt = systemPrompt
        ? `${systemPrompt}\n${msg.content}`
        : msg.content;
    } else {
      userMessages.push(msg);
    }
  }

  const body: Record<string, unknown> = {
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    messages: userMessages,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Anthropic API error: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const data = (await response.json()) as {
    id: string;
    content: Array<{ type: string; text: string }>;
    model: string;
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
  };

  const textContent = data.content.filter((c) => c.type === "text");
  const fullText = textContent.map((c) => c.text).join("");

  return {
    id: data.id,
    model: data.model,
    content: textContent as Array<{ type: "text"; text: string }>,
    usage: data.usage,
    // Compatibility shim for code using OpenAI-style response shape
    choices: [
      {
        message: {
          role: "assistant",
          content: fullText,
        },
        finish_reason: data.stop_reason,
      },
    ],
  };
}
