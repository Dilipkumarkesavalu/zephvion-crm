/**
 * Minimal client for an OpenAI-compatible chat completions API, which most
 * open-model hosts (Groq, Together, OpenRouter, Ollama, vLLM) provide.
 */

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatResult {
  message: Extract<ChatMessage, { role: "assistant" }>;
  finishReason: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class ModelError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Reads a chat completion response into what the assistant needs. */
export const readChatResponse = (body: unknown): ChatResult => {
  const data = (body ?? {}) as {
    choices?: Array<{
      message?: { content?: string | null; tool_calls?: ToolCall[] };
      finish_reason?: string;
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const choice = data.choices?.[0];
  if (!choice?.message) throw new ModelError("The model sent no answer.", 502);
  const toolCalls = (choice.message.tool_calls ?? []).filter(
    (call) =>
      call?.type === "function" && typeof call.function?.name === "string",
  );
  return {
    message: {
      role: "assistant",
      content: choice.message.content ?? null,
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    },
    finishReason: choice.finish_reason ?? "stop",
    inputTokens: Number(data.usage?.prompt_tokens) || 0,
    outputTokens: Number(data.usage?.completion_tokens) || 0,
  };
};

/** Tool arguments arrive as a JSON string; bad JSON becomes an empty object. */
export const parseToolArguments = (raw: string): unknown => {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

/** Some open models wrap their reasoning in <think> tags; never show it. */
export const stripReasoning = (text: string | null): string =>
  (text ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();

export const chat = async (
  config: ModelConfig,
  messages: ChatMessage[],
  options: { tools?: unknown[]; maxTokens: number },
): Promise<ChatResult> => {
  const response = await fetch(
    `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: options.maxTokens,
        temperature: 0.3,
        ...(options.tools?.length
          ? { tools: options.tools, tool_choice: "auto" }
          : {}),
      }),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      `HTTP ${response.status}`;
    throw new ModelError(detail, response.status);
  }
  return readChatResponse(body);
};
