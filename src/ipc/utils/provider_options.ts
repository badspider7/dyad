import type { SmartContextMode, UserSettings } from "../../lib/schemas";
import type { CodebaseFile } from "../../utils/codebase";
import type { VersionedFiles } from "./versioned_codebase_context";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { getExtraProviderOptions } from "./thinking_utils";

export interface MentionedAppCodebase {
  appName: string;
  files: CodebaseFile[];
}

export interface GetProviderOptionsParams {
  dyadAppId: number;
  dyadRequestId?: string;
  dyadDisableFiles?: boolean;
  smartContextMode?: SmartContextMode;
  files: CodebaseFile[];
  versionedFiles?: VersionedFiles;
  mentionedAppsCodebases: MentionedAppCodebase[];
  builtinProviderId: string | undefined;
  settings: UserSettings;
}

/**
 * Builds provider options for the AI SDK streamText call.
 * Handles provider-specific configuration including thinking configs for Google/Vertex.
 */
export function getProviderOptions({
  dyadAppId,
  dyadRequestId,
  dyadDisableFiles,
  smartContextMode,
  files,
  versionedFiles,
  mentionedAppsCodebases,
  builtinProviderId,
  settings,
}: GetProviderOptionsParams): Record<string, any> {
  const providerOptions: Record<string, any> = {
    // Dyad Engine专用选项 - 包含应用ID、请求ID、文件上下文等
    "dyad-engine": {
      dyadAppId,
      dyadRequestId,
      dyadDisableFiles,
      dyadSmartContextMode: smartContextMode,
      dyadFiles: versionedFiles ? undefined : files,
      dyadVersionedFiles: versionedFiles,
      dyadMentionedApps: mentionedAppsCodebases.map(({ files, appName }) => ({
        appName,
        files,
      })),
    },
    // Dyad Gateway选项 - 额外的提供商特定配置
    "dyad-gateway": getExtraProviderOptions(builtinProviderId, settings),
    // OpenAI特定选项
    openai: {
      reasoningSummary: "auto",
    } satisfies OpenAIResponsesProviderOptions,
  };

  // 仅对支持的模型有条件地包含Google thinking配置
  const selectedModelName = settings.selectedModel.name || "";
  const providerId = builtinProviderId;
  const isVertex = providerId === "vertex";
  const isGoogle = providerId === "google";
  const isPartnerModel = selectedModelName.includes("/");
  const isGeminiModel = selectedModelName.startsWith("gemini");
  const isFlashLite = selectedModelName.includes("flash-lite");

  // 保持Google提供商行为不变：始终包含includeThoughts
  if (isGoogle) {
    providerOptions.google = {
      thinkingConfig: {
        includeThoughts: true,
      },
    } satisfies GoogleGenerativeAIProviderOptions;
  }

  // Vertex特定修复：仅在支持的Gemini模型上启用thinking
  if (isVertex && isGeminiModel && !isFlashLite && !isPartnerModel) {
    providerOptions.google = {
      thinkingConfig: {
        includeThoughts: true,
      },
    } satisfies GoogleGenerativeAIProviderOptions;
  }

  return providerOptions;
}

export interface GetAiHeadersParams {
  builtinProviderId: string | undefined;
}

/**
 * Returns AI request headers based on the provider.
 * Currently adds Anthropic-specific beta header for extended context.
 */
export function getAiHeaders({
  builtinProviderId,
}: GetAiHeadersParams): Record<string, string> | undefined {
  if (builtinProviderId === "anthropic") {
    return {
      "anthropic-beta": "context-1m-2025-08-07",
    };
  }
  return undefined;
}
