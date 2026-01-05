import { AI_MESSAGES_SDK_VERSION, AiMessagesJsonV5 } from "@/db/schema";
import type { ModelMessage } from "ai";
import log from "electron-log";

const logger = log.scope("ai_messages_utils");

/** Maximum size in bytes for ai_messages_json (1MB) */
export const MAX_AI_MESSAGES_SIZE = 1_000_000;

/**
 * Convert a message with potential Buffer/ImagePart content to JSON-serializable format
 * This handles Buffer objects by converting them to base64 strings
 */
function convertMessageForJson(message: ModelMessage): ModelMessage {
  // If content is a string, no conversion needed
  if (typeof message.content === "string") {
    return message;
  }

  // Content is an array of parts
  const contentParts = message.content.map((part: any) => {
    // If it's an image part with Buffer, convert to base64
    if (part.type === "image" && Buffer.isBuffer(part.image)) {
      return {
        type: "image",
        image: {
          _serialized: true,
          data: part.image.toString("base64"),
          mediaType: part.mediaType,
        },
      };
    }

    // If it's a file part with Buffer or Uint8Array, convert to base64
    if (part.type === "file") {
      if (Buffer.isBuffer(part.data)) {
        return {
          type: "file",
          data: {
            _serialized: true,
            data: part.data.toString("base64"),
          },
          filename: part.filename,
          mediaType: part.mediaType,
        };
      }
      if (part.data instanceof Uint8Array) {
        return {
          type: "file",
          data: {
            _serialized: true,
            data: Buffer.from(part.data).toString("base64"),
          },
          filename: part.filename,
          mediaType: part.mediaType,
        };
      }
    }

    // For other parts, keep as is
    return part;
  });

  return {
    ...message,
    content: contentParts as any,
  };
}

/**
 * Convert a JSON-serialized message back to proper ModelMessage format
 * This handles converting base64 strings back to Buffer objects
 */
function convertMessageFromJson(message: ModelMessage): ModelMessage {
  // If content is a string, no conversion needed
  if (typeof message.content === "string") {
    return message;
  }

  // Content is an array of parts
  const contentParts = message.content.map((part: any) => {
    // If it's an image part with serialized data, convert back to Buffer
    if (part.type === "image" && part.image && typeof part.image === "object" && "_serialized" in part.image) {
      const serialized = part.image;
      return {
        type: "image",
        image: Buffer.from(serialized.data, "base64"),
        mediaType: serialized.mediaType,
      };
    }

    // If it's a file part with serialized data, convert back to Buffer
    if (part.type === "file" && part.data && typeof part.data === "object" && "_serialized" in part.data) {
      const serialized = part.data;
      return {
        type: "file",
        data: Buffer.from(serialized.data, "base64"),
        filename: part.filename,
        mediaType: part.mediaType,
      };
    }

    // For other parts, keep as is
    return part;
  });

  return {
    ...message,
    content: contentParts as any,
  };
}

/**
 * Check if ai_messages_json is within size limits and return value to save.
 * Returns undefined if the messages exceed the size limit.
 */
export function getAiMessagesJsonIfWithinLimit(
  aiMessages: ModelMessage[],
): AiMessagesJsonV5 | undefined {
  if (!aiMessages || aiMessages.length === 0) {
    return undefined;
  }

  // Convert messages to JSON-serializable format before checking size
  const convertedMessages = aiMessages.map(convertMessageForJson);

  const payload: AiMessagesJsonV5 = {
    messages: convertedMessages,
    sdkVersion: AI_MESSAGES_SDK_VERSION,
  };

  const jsonStr = JSON.stringify(payload);
  if (jsonStr.length <= MAX_AI_MESSAGES_SIZE) {
    return payload;
  }

  logger.warn(
    `ai_messages_json too large (${jsonStr.length} bytes), skipping save`,
  );
  return undefined;
}

// Type for a message from the database used by parseAiMessagesJson
export type DbMessageForParsing = {
  id: number;
  role: string;
  content: string;
  aiMessagesJson: AiMessagesJsonV5 | ModelMessage[] | null;
};

/**
 * Parse ai_messages_json with graceful fallback to simple content reconstruction.
 * If aiMessagesJson is missing, malformed, or incompatible with the current AI SDK,
 * falls back to constructing a basic message from role and content.
 *
 * This is a pure function - it doesn't log or have side effects.
 */
export function parseAiMessagesJson(msg: DbMessageForParsing): ModelMessage[] {
  if (msg.aiMessagesJson) {
    const parsed = msg.aiMessagesJson;

    // Legacy shape: stored directly as a ModelMessage[]
    if (
      Array.isArray(parsed) &&
      parsed.every((m) => m && typeof m.role === "string")
    ) {
      // Convert messages from JSON format back to proper ModelMessage format
      return parsed.map(convertMessageFromJson);
    }

    // Current shape: { messages: ModelMessage[]; sdkVersion: "ai@v5" }
    if (
      parsed &&
      typeof parsed === "object" &&
      "sdkVersion" in parsed &&
      (parsed as AiMessagesJsonV5).sdkVersion === AI_MESSAGES_SDK_VERSION &&
      "messages" in parsed &&
      Array.isArray((parsed as AiMessagesJsonV5).messages) &&
      (parsed as AiMessagesJsonV5).messages.every(
        (m: ModelMessage) => m && typeof m.role === "string",
      )
    ) {
      // Convert messages from JSON format back to proper ModelMessage format
      const messages = (parsed as AiMessagesJsonV5).messages;
      return messages.map(convertMessageFromJson);
    }
  }

  // Fallback for legacy messages, missing data, or incompatible formats
  return [
    {
      role: msg.role as "user" | "assistant",
      content: msg.content,
    },
  ];
}
