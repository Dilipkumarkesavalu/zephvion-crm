// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  chat,
  ModelError,
  parseToolArguments,
  readChatResponse,
  stripReasoning,
} from "./openModel";

describe("readChatResponse", () => {
  it("reads text, tool calls and token usage", () => {
    const result = readChatResponse({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "query_crm",
                  arguments: '{"resource":"deals"}',
                },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 812, completion_tokens: 24 },
    });

    expect(result).toEqual({
      message: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "query_crm", arguments: '{"resource":"deals"}' },
          },
        ],
      },
      finishReason: "tool_calls",
      inputTokens: 812,
      outputTokens: 24,
    });
  });

  it("fails clearly when the model sends nothing", () => {
    expect(() => readChatResponse({ choices: [] })).toThrow(ModelError);
  });
});

describe("parseToolArguments", () => {
  it("turns bad JSON into an empty object instead of crashing", () => {
    expect(parseToolArguments('{"resource":"leads"}')).toEqual({
      resource: "leads",
    });
    expect(parseToolArguments("{oops")).toEqual({});
    expect(parseToolArguments('"text"')).toEqual({});
  });
});

describe("stripReasoning", () => {
  it("hides <think> blocks some open models emit", () => {
    expect(
      stripReasoning(
        "<think>Let me check…</think>\n\nTwo invoices are overdue.",
      ),
    ).toBe("Two invoices are overdue.");
    expect(stripReasoning(null)).toBe("");
  });
});

describe("chat", () => {
  const config = {
    baseUrl: "https://api.example.com/openai/v1/",
    apiKey: "test-key",
    model: "llama-3.3-70b-versatile",
  };

  it("posts an OpenAI-compatible request with the tools", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "Done" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 2 },
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const result = await chat(config, [{ role: "user", content: "Hi" }], {
        tools: [{ type: "function" }],
        maxTokens: 100,
      });
      expect(result.message.content).toBe("Done");
    } finally {
      globalThis.fetch = realFetch;
    }

    expect(calls[0].url).toBe(
      "https://api.example.com/openai/v1/chat/completions",
    );
    expect(
      (calls[0].init.headers as Record<string, string>).Authorization,
    ).toBe("Bearer test-key");
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      model: "llama-3.3-70b-versatile",
      max_tokens: 100,
      tools: [{ type: "function" }],
      tool_choice: "auto",
    });
  });

  it("reports the provider's error and status", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ error: { message: "Rate limit reached" } }),
        {
          status: 429,
        },
      )) as typeof fetch;
    try {
      await expect(
        chat(config, [{ role: "user", content: "Hi" }], { maxTokens: 10 }),
      ).rejects.toMatchObject({ status: 429, message: "Rate limit reached" });
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
