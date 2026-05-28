// Provider abstraction for the AI layer. The SOP assistant talks to this
// interface only; swapping providers is a configuration change.
//
// Today: Anthropic Claude via @anthropic-ai/sdk.
// Tomorrow: any provider that satisfies AIProvider.

import { logger } from "../logger";

export type AIToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    required?: string[];
    properties: Record<string, unknown>;
    additionalProperties?: boolean;
  };
};

export type AIRequest = {
  systemPrompt: string;
  userMessage: string;
  tool: AIToolDefinition;
  maxOutputTokens?: number;
  cacheSystemPrompt?: boolean;
};

export type AIResponse<T> = {
  output: T | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  model: string;
  provider: string;
  stopReason: string | null;
  rawError?: string;
};

export interface AIProvider {
  callStructured<T>(req: AIRequest): Promise<AIResponse<T>>;
  readonly providerName: string;
  readonly modelName: string;
  readonly available: boolean;
}

class AnthropicProvider implements AIProvider {
  readonly providerName = "anthropic";
  readonly modelName: string;
  readonly available: boolean;
  private apiKey: string;

  constructor(model: string, apiKey: string) {
    this.modelName = model;
    this.apiKey = apiKey;
    this.available = apiKey.length > 0;
  }

  async callStructured<T>(req: AIRequest): Promise<AIResponse<T>> {
    if (!this.available) {
      return {
        output: null,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        model: this.modelName,
        provider: this.providerName,
        stopReason: null,
        rawError: "ANTHROPIC_API_KEY is not set"
      };
    }

    let Anthropic: typeof import("@anthropic-ai/sdk").default;
    try {
      const mod = await import("@anthropic-ai/sdk");
      Anthropic = mod.default;
    } catch (error) {
      logger.error({ err: (error as Error).message }, "Anthropic SDK not installed");
      return {
        output: null,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        model: this.modelName,
        provider: this.providerName,
        stopReason: null,
        rawError: "Anthropic SDK is not installed. Run `npm install @anthropic-ai/sdk`."
      };
    }

    const client = new Anthropic({ apiKey: this.apiKey });

    try {
      const systemBlocks: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> = [
        {
          type: "text",
          text: req.systemPrompt
        }
      ];
      if (req.cacheSystemPrompt) {
        systemBlocks[0].cache_control = { type: "ephemeral" };
      }

      const response = await client.messages.create({
        model: this.modelName,
        max_tokens: req.maxOutputTokens ?? 1024,
        system: systemBlocks,
        tools: [req.tool],
        tool_choice: { type: "tool", name: req.tool.name },
        messages: [{ role: "user", content: req.userMessage }]
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      const output = toolUse && toolUse.type === "tool_use" ? (toolUse.input as T) : null;

      const usage = response.usage as {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
      };

      return {
        output,
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
        model: this.modelName,
        provider: this.providerName,
        stopReason: response.stop_reason ?? null
      };
    } catch (error) {
      const message = (error as Error).message ?? "Unknown error";
      logger.error({ err: message }, "Anthropic call failed");
      return {
        output: null,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        model: this.modelName,
        provider: this.providerName,
        stopReason: null,
        rawError: message
      };
    }
  }
}

let cachedProvider: AIProvider | null = null;

export function getAIProvider(modelOverride?: string): AIProvider {
  if (cachedProvider && !modelOverride) {
    return cachedProvider;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const model = modelOverride ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const provider = new AnthropicProvider(model, apiKey);
  if (!modelOverride) {
    cachedProvider = provider;
  }
  return provider;
}

// Test seam: tests inject a stub provider so the AI layer is exercised
// end-to-end without an API key.
export function __setAIProviderForTests(provider: AIProvider | null) {
  cachedProvider = provider;
}
