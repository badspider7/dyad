import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ToolCall {
  type: string;
  toolCallId: string;
  toolName: string;
  args: any;
}

interface ToolResult {
  toolCallId: string;
  result: any;
}

interface ToolCallsDisplayProps {
  aiMessagesJson: {
    messages: Array<{
      role: string;
      content: string | Array<any>;
      toolCalls?: Array<ToolCall>;
    }>;
    sdkVersion: string;
  };
}

// 格式化并截断显示的数据
function formatData(data: any, maxLength: number = 200): string {
  if (data === undefined || data === null) {
    return "(无数据)";
  }
  
  let formatted: string;
  if (typeof data === "string") {
    formatted = data;
  } else {
    try {
      formatted = JSON.stringify(data, null, 2);
    } catch (e) {
      formatted = String(data);
    }
  }

  if (formatted.length > maxLength) {
    return formatted.substring(0, maxLength) + "...";
  }
  return formatted;
}

export function ToolCallsDisplay({ aiMessagesJson }: ToolCallsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 提取所有的 tool calls 和 tool results
  const toolCallsAndResults: Array<{
    type: "call" | "result";
    toolName: string;
    toolCallId: string;
    data: any;
  }> = [];

  for (const message of aiMessagesJson.messages) {
    // 处理 tool calls
    if (message.toolCalls && message.toolCalls.length > 0) {
      for (const toolCall of message.toolCalls) {
        toolCallsAndResults.push({
          type: "call",
          toolName: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          data: toolCall.args,
        });
      }
    }

    // 处理消息内容中的 tool calls 和 results
    if (message.content && Array.isArray(message.content)) {
      for (const part of message.content) {
        // Tool call: { type: "tool-call", toolCallId, toolName, input }
        if (part.type === "tool-call") {
          toolCallsAndResults.push({
            type: "call",
            toolName: part.toolName || "unknown",
            toolCallId: part.toolCallId || "unknown",
            data: part.input, // 输入参数在 input 字段
          });
        }
        // Tool result: { type: "tool-result", toolCallId, toolName, output }
        else if (part.type === "tool-result") {
          // output 可能是 { type: "text", value: "..." } 或其他格式
          let resultData = part.output;
          if (resultData && typeof resultData === "object" && "value" in resultData) {
            resultData = resultData.value;
          }
          toolCallsAndResults.push({
            type: "result",
            toolName: part.toolName || "unknown",
            toolCallId: part.toolCallId || "unknown",
            data: resultData, // 输出结果在 output 字段
          });
        }
      }
    }
    // 兼容旧格式：message.role === "tool"
    else if (message.role === "tool") {
      const content = message.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === "tool-result") {
            toolCallsAndResults.push({
              type: "result",
              toolName: part.toolName || "unknown",
              toolCallId: part.toolCallId,
              data: part.result || part.output,
            });
          }
        }
      } else if (typeof content === "string") {
        toolCallsAndResults.push({
          type: "result",
          toolName: "unknown",
          toolCallId: "unknown",
          data: content,
        });
      }
    }
  }

  if (toolCallsAndResults.length === 0) {
    return null;
  }

  // 只统计工具调用的数量，不包括结果
  const toolCallsCount = toolCallsAndResults.filter(item => item.type === "call").length;

  return (
    <div className="my-4 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Wrench className="h-4 w-4" />
        <span className="font-medium text-sm">
          工具调用 ({toolCallsCount})
        </span>
      </button>

      {isExpanded && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {toolCallsAndResults.map((item, index) => (
            <div key={index} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium whitespace-nowrap",
                    item.type === "call"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
                  )}
                >
                  {item.type === "call" ? "调用" : "结果"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm mb-1">{item.toolName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    ID: {item.toolCallId}
                  </div>
                  <div className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {item.type === "call" ? "输入参数:" : "输出结果:"}
                  </div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words text-black">
                    {formatData(item.data, 200)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

