# chat_stream_handlers.ts 函数详解

本文档详细解释 `src/ipc/handlers/chat_stream_handlers.ts` 文件中的所有函数。

---

## 目录

1. [工具函数](#工具函数)
2. [流处理函数](#流处理函数)
3. [消息处理函数](#消息处理函数)
4. [标签处理函数](#标签处理函数)
5. [主处理器](#主处理器)
6. [MCP 相关函数](#mcp-相关函数)

---

## 工具函数

### `isTextFile`

判断文件是否为文本文件。

```typescript
async function isTextFile(filePath: string): Promise<boolean>
```

**参数:**
- `filePath: string` - 文件路径

**返回值:**
- `Promise<boolean>` - 如果文件扩展名在文本文件列表中，返回 `true`，否则返回 `false`

**支持的文本文件扩展名:**
- `.md` - Markdown 文件
- `.txt` - 文本文件
- `.json` - JSON 文件
- `.csv` - CSV 文件
- `.js` - JavaScript 文件
- `.ts` - TypeScript 文件
- `.html` - HTML 文件
- `.css` - CSS 文件

**使用示例:**
```typescript
const isText = await isTextFile("/path/to/file.js");
console.log(isText); // true

const isImage = await isTextFile("/path/to/image.png");
console.log(isImage); // false
```

---

### `escapeXml`

转义 XML 特殊字符，防止 XML 注入。

```typescript
function escapeXml(unsafe: string): string
```

**参数:**
- `unsafe: string` - 需要转义的字符串

**返回值:**
- `string` - 转义后的字符串

**转义的字符:**
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`

**使用示例:**
```typescript
const unsafe = '<script>alert("XSS")</script>';
const safe = escapeXml(unsafe);
console.log(safe); // &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
```

---

### `parseMcpToolKey`

解析 MCP 工具键，该键结合了服务器名称和工具名称。

```typescript
function parseMcpToolKey(toolKey: string): {
  serverName: string;
  toolName: string;
}
```

**参数:**
- `toolKey: string` - MCP 工具键，格式为 "serverName__toolName"

**返回值:**
- `{ serverName: string, toolName: string }` - 包含服务器名称和工具名称的对象

**说明:**
- 使用最后一个 `__` 分隔符来拆分键，避免任一侧包含 `__` 时的歧义

**使用示例:**
```typescript
const result = parseMcpToolKey("my-server__read-file");
console.log(result); // { serverName: "my-server", toolName: "read-file" }

const result2 = parseMcpToolKey("server__with__double__separator");
console.log(result2); // { serverName: "server__with__double", toolName: "separator" }
```

---

### `createCodebasePrompt`

创建代码库提示文本。

```typescript
function createCodebasePrompt(codebaseInfo: string): string
```

**参数:**
- `codebaseInfo: string` - 代码库信息

**返回值:**
- `string` - 格式化后的提示文本

**格式:**
```
This is my codebase. {codebaseInfo}
```

**使用示例:**
```typescript
const prompt = createCodebasePrompt("This is a React app with components...");
console.log(prompt); // "This is my codebase. This is a React app with components..."
```

---

### `createOtherAppsCodebasePrompt`

创建其他应用的代码库提示文本。

```typescript
function createOtherAppsCodebasePrompt(otherAppsCodebaseInfo: string): string
```

**参数:**
- `otherAppsCodebaseInfo: string` - 其他应用的代码库信息

**返回值:**
- `string` - 格式化后的提示文本

**格式:**
```markdown
# Referenced Apps

These are the other apps that I've mentioned in my prompt. These other apps' codebases are READ-ONLY.

{otherAppsCodebaseInfo}
```

**使用示例:**
```typescript
const prompt = createOtherAppsCodebasePrompt("App A: React App\nApp B: Node API");
console.log(prompt);
/*
# Referenced Apps

These are the other apps that I've mentioned in my prompt. These other apps' codebases are READ-ONLY.

App A: React App
App B: Node API
*/
```

---

## 流处理函数

### `processStreamChunks`

处理来自 AI 流式响应的文本块。

```typescript
async function processStreamChunks({
  fullStream,
  fullResponse,
  abortController,
  chatId,
  processResponseChunkUpdate,
}: {
  fullStream: AsyncIterableStream<TextStreamPart<ToolSet>>;
  fullResponse: string;
  abortController: AbortController;
  chatId: number;
  processResponseChunkUpdate: (params: {
    fullResponse: string;
  }) => Promise<string>;
}): Promise<{ fullResponse: string; incrementalResponse: string }>
```

**参数:**
- `fullStream: AsyncIterableStream<TextStreamPart<ToolSet>>` - 来自 AI 的完整流
- `fullResponse: string` - 当前的完整响应文本
- `abortController: AbortController` - 用于取消流的控制器
- `chatId: number` - 聊天 ID
- `processResponseChunkUpdate: Function` - 处理响应块更新的回调函数

**返回值:**
- `Promise<{ fullResponse: string, incrementalResponse: string }>` - 包含完整响应和增量响应的对象

**功能说明:**
1. 遍历流中的每个部分
2. 处理不同类型的流部分：
   - `text-delta` - 文本增量
   - `reasoning-delta` - 推理增量（在思考标签中）
   - `tool-call` - 工具调用
   - `tool-result` - 工具结果
3. 处理思考块的开始和结束
4. 实时清理和更新响应
5. 检查中止信号并提前退出

**使用示例:**
```typescript
const result = await processStreamChunks({
  fullStream: aiStream.fullStream,
  fullResponse: "",
  abortController: new AbortController(),
  chatId: 1,
  processResponseChunkUpdate: async ({ fullResponse }) => {
    // 发送更新到前端
    sendToFrontend(fullResponse);
    return fullResponse;
  }
});

console.log(result.fullResponse); // 完整的 AI 响应
console.log(result.incrementalResponse); // 增量响应
```

---

## 消息处理函数

### `formatMessagesForSummary`

格式化消息用于摘要生成。

```typescript
export function formatMessagesForSummary(
  messages: { role: string; content: string | undefined }[]
): string
```

**参数:**
- `messages: Array<{ role: string, content: string | undefined }>` - 消息数组

**返回值:**
- `string` - 格式化后的 XML 格式消息字符串

**逻辑说明:**
- 如果消息数量 ≤ 8，包含所有消息
- 如果消息数量 > 8，包含：
  - 前 2 条消息
  - 省略指示器 `[... X messages omitted ...]`
  - 最后 6 条消息

**输出格式:**
```xml
<message role="user">用户消息内容</message>
<message role="assistant">助手消息内容</message>
```

**使用示例:**
```typescript
const messages = [
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hi there!" },
  { role: "user", content: "How are you?" }
];

const formatted = formatMessagesForSummary(messages);
console.log(formatted);
/*
<message role="user">Hello</message>
<message role="assistant">Hi there!</message>
<message role="user">How are you?</message>
*/
```

---

### `replaceTextAttachmentWithContent`

将文本附件占位符替换为完整内容。

```typescript
async function replaceTextAttachmentWithContent(
  text: string,
  filePath: string,
  fileName: string
): Promise<string>
```

**参数:**
- `text: string` - 包含占位符的文本
- `filePath: string` - 文件路径
- `fileName: string` - 文件名

**返回值:**
- `Promise<string>` - 替换后的文本

**功能说明:**
1. 检查文件是否为文本文件
2. 读取文件内容
3. 使用正则表达式查找并替换占位符标签
4. 将占位符替换为代码块格式的内容

**替换格式:**
```
<dyad-text-attachment filename="..." type="..." path="..."></dyad-text-attachment>
```
↓
```
Full content of {fileName}:
```
{文件内容}
```
```

**使用示例:**
```typescript
const text = `Some text <dyad-text-attachment filename="example.js" type="text/javascript" path="/path/to/example.js"></dyad-text-attachment> more text`;

const result = await replaceTextAttachmentWithContent(
  text,
  "/path/to/example.js",
  "example.js"
);

console.log(result);
/*
Some text Full content of example.js:
```
console.log("Hello World");
```
 more text
*/
```

---

### `prepareMessageWithAttachments`

将传统消息转换为带有附件的消息。

```typescript
async function prepareMessageWithAttachments(
  message: ModelMessage,
  attachmentPaths: string[]
): Promise<ModelMessage>
```

**参数:**
- `message: ModelMessage` - 原始消息
- `attachmentPaths: string[]` - 附件路径数组

**返回值:**
- `Promise<ModelMessage>` - 包含附件的消息

**功能说明:**
1. 处理文本文件附件：替换占位符为实际内容
2. 构建内容部分数组
3. 添加文本部分（可能包含替换后的内容）
4. 添加图像附件部分

**返回格式:**
```typescript
{
  role: "user",
  content: [
    { type: "text", text: "消息文本" },
    { type: "image", image: Buffer }
  ]
}
```

**支持的图像格式:**
- `.jpg`, `.jpeg`
- `.png`
- `.gif`
- `.webp`

**使用示例:**
```typescript
const message = {
  role: "user",
  content: "Here's an image and a file."
};

const attachmentPaths = [
  "/path/to/image.png",
  "/path/to/file.js"
];

const prepared = await prepareMessageWithAttachments(
  message,
  attachmentPaths
);

// prepared.content 现在是一个包含文本和图像的数组
```

---

## 标签处理函数

### `removeNonEssentialTags`

移除非必要的标签（思考标签和问题报告标签）。

```typescript
function removeNonEssentialTags(text: string): string
```

**参数:**
- `text: string` - 包含标签的文本

**返回值:**
- `string` - 移除非必要标签后的文本

**移除的标签:**
- 思考标签 (`This is the answer<dyad-problem-report>...</dyad-problem-report>`;
const clean = removeNonEssentialTags(text);
console.log(clean); // "This is the answer"
```

---

### `removeThinkingTags`

移除思考标签。

```typescript
function removeThinkingTags(text: string): string
```

**参数:**
- `text: string` - 包含思考标签的文本

**返回值:**
- `string` - 移除思考标签后的文本

**正则表达式:**
```javascript
/<think>([\s\S]*?)<\/think>/g
```

**使用示例:**
```typescript
const text = `<think>I need to analyze this...</think>Here's the solution.`;
const clean = removeThinkingTags(text);
console.log(clean); // "Here's the solution."
```

---

### `removeProblemReportTags`

移除问题报告标签。

```typescript
export function removeProblemReportTags(text: string): string
```

**参数:**
- `text: string` - 包含问题报告标签的文本

**返回值:**
- `string` - 移除问题报告标签后的文本

**正则表达式:**
```javascript
/<dyad-problem-report[^>]*>[\s\S]*?<\/dyad-problem-report>/g
```

**使用示例:**
```typescript
const text = `Some code <dyad-problem-report summary="2 errors">...</dyad-problem-report>`;
const clean = removeProblemReportTags(text);
console.log(clean); // "Some code"
```

---

### `removeDyadTags`

移除所有 dyad 标签。

```typescript
export function removeDyadTags(text: string): string
```

**参数:**
- `text: string` - 包含 dyad 标签的文本

**返回值:**
- `string` - 移除所有 dyad 标签后的文本

**正则表达式:**
```javascript
/<dyad-[^>]*>[\s\S]*?<\/dyad-[^>]*>/g
```

**移除的标签类型:**
- `<dyad-write>...</dyad-write>`
- `<dyad-read>...</dyad-read>`
- `<dyad-delete>...</dyad-delete>`
- `<dyad-search-replace>...</dyad-search-replace>`
- 等等所有 dyad-* 标签

**使用示例:**
```typescript
const text = `<dyad-write path="file.js">code</dyad-write>Some text<dyad-read path="file.js"></dyad-read>`;
const clean = removeDyadTags(text);
console.log(clean); // "Some text"
```

---

### `hasUnclosedDyadWrite`

检查是否存在未闭合的 dyad-write 标签。

```typescript
export function hasUnclosedDyadWrite(text: string): boolean
```

**参数:**
- `text: string` - 要检查的文本

**返回值:**
- `boolean` - 如果存在未闭合的 dyad-write 标签返回 `true`，否则返回 `false`

**检查逻辑:**
1. 查找最后一个 `<dyad-write>` 标签的位置
2. 如果没有找到，返回 `false`
3. 检查最后一个打开标签之后是否有闭合标签 `</dyad-write>`
4. 如果没有闭合标签，返回 `true`

**使用示例:**
```typescript
const text1 = `<dyad-write path="file.js">code</dyad-write>`;
console.log(hasUnclosedDyadWrite(text1)); // false

const text2 = `<dyad-write path="file.js">code`;
console.log(hasUnclosedDyadWrite(text2)); // true

const text3 = `<dyad-write>code1</dyad-write><dyad-write>code2`;
console.log(hasUnclosedDyadWrite(text3)); // true
```

---

### `escapeDyadTags`

转义 dyad 标签以避免被误解析。

```typescript
function escapeDyadTags(text: string): string
```

**参数:**
- `text: string` - 需要转义的文本

**返回值:**
- `string` - 转义后的文本

**转义规则:**
- `<dyad` → `＜dyad`（使用全角小于号）
- `</dyad` → `＜/dyad`

**目的:**
防止推理内容中的 dyad 标签被以下组件误解析：
1. 前端 Markdown 解析器
2. 主进程响应处理器

**使用示例:**
```typescript
const text = "The AI suggested using <dyad-write> tags";
const escaped = escapeDyadTags(text);
console.log(escaped); // "The AI suggested using ＜dyad-write> tags"
```

---

## 主处理器

### `registerChatStreamHandlers`

注册聊天流处理的 IPC 处理器。

```typescript
export function registerChatStreamHandlers(): void
```

**功能:**
注册以下 IPC 处理器：
1. `chat:stream` - 处理流式聊天请求
2. `chat:cancel` - 取消正在进行的流

---

#### `chat:stream` 处理器

处理流式聊天请求的主入口。

**参数:**
- `req: ChatStreamParams` - 聊天流参数

**主要流程:**
1. **初始化**
   - 创建 AbortController
   - 获取聊天信息和历史消息
   - 处理 redo 选项（如果需要）

2. **附件处理**
   - 将附件保存到临时目录
   - 为上传到代码库的附件生成唯一 ID
   - 读取文本附件内容并添加到提示

3. **消息插入**
   - 插入用户消息到数据库
   - 插入占位的助手消息

4. **代码库上下文提取**
   - 从文件系统提取代码库信息
   - 处理提及的应用
   - 构建智能上下文

5. **消息历史准备**
   - 格式化消息历史
   - 限制历史长度以适应上下文窗口

6. **系统提示构建**
   - 构建系统提示
   - 添加 Supabase 上下文（如果连接）
   - 添加安全审查提示（如果需要）
   - 添加附件处理说明

7. **AI 请求**
   - 获取模型客户端
   - 调用 `streamText` 发送请求到 AI 提供商
   - 处理流式响应

8. **响应处理**
   - 处理流式文本块
   - 应用 Turbo Edits V2（如果启用）
   - 处理未闭合的 dyad-write 标签
   - 自动修复问题（如果启用）

9. **完成处理**
   - 保存完整响应到数据库
   - 处理 dyad 标签（应用更改）
   - 发送完成事件

10. **清理**
    - 清理 AbortController
    - 清理临时文件

**使用示例:**
```typescript
// 在 IPC host 中注册
registerChatStreamHandlers();

// 前端调用
const response = await ipcRenderer.invoke("chat:stream", {
  chatId: 1,
  prompt: "Hello, how are you?",
  attachments: [
    {
      name: "file.js",
      type: "text/javascript",
      data: "base64data...",
      attachmentType: "upload-to-codebase"
    }
  ],
  selectedComponents: [],
  redo: false
});
```

---

#### `chat:cancel` 处理器

取消正在进行的流式响应。

**参数:**
- `chatId: number` - 要取消的聊天 ID

**流程:**
1. 获取对应 chatId 的 AbortController
2. 调用 abort() 方法中止流
3. 从活动流映射中删除
4. 发送结束事件到渲染进程
5. 清理文件上传状态

**返回值:**
- `boolean` - 总是返回 `true`

**使用示例:**
```typescript
// 前端调用
const cancelled = await ipcRenderer.invoke("chat:cancel", chatId);
console.log(cancelled); // true
```

---

## MCP 相关函数

### `getMcpTools`

获取所有已启用的 MCP 工具。

```typescript
async function getMcpTools(event: IpcMainInvokeEvent): Promise<ToolSet>
```

**参数:**
- `event: IpcMainInvokeEvent` - IPC 调用事件

**返回值:**
- `Promise<ToolSet>` - MCP 工具集

**流程:**
1. 从数据库查询所有启用的 MCP 服务器
2. 对于每个服务器：
   - 获取 MCP 客户端实例
   - 获取工具集
   - 为每个工具创建包装器
   - 需要用户同意才能执行工具
3. 返回组合的工具集

**工具键格式:**
```
{serverName}__{toolName}
```

**使用示例:**
```typescript
const tools = await getMcpTools(event);
// tools = {
//   "my-server__read-file": {
//     description: "Read a file",
//     inputSchema: { ... },
//     execute: async (args) => { ... }
//   }
// }
```

---

## 辅助函数和常量

### 常量

#### `TEXT_FILE_EXTENSIONS`

支持的文本文件扩展名数组。

```typescript
const TEXT_FILE_EXTENSIONS = [
  ".md", ".txt", ".json", ".csv",
  ".js", ".ts", ".html", ".css"
];
```

#### `TEMP_DIR`

临时文件存储目录。

```typescript
const TEMP_DIR = path.join(os.tmpdir(), "dyad-attachments");
```

#### `CODEBASE_PROMPT_PREFIX`

代码库提示前缀。

```typescript
const CODEBASE_PROMPT_PREFIX = "This is my codebase.";
```

#### `activeStreams`

活动流映射，用于跟踪和取消流。

```typescript
const activeStreams = new Map<number, AbortController>();
```

#### `partialResponses`

部分响应映射，用于保存取消的流的响应。

```typescript
const partialResponses = new Map<number, string>();
```

---

## 工作流程示例

### 完整的聊天流处理流程

```typescript
// 1. 用户发送消息
const userPrompt = "Add a new button component";

// 2. 前端调用 IPC
const chatId = await ipcRenderer.invoke("chat:stream", {
  chatId: 1,
  prompt: userPrompt,
  attachments: [],
  selectedComponents: [],
  redo: false
});

// 3. chat:stream 处理器执行：
//    a. 保存用户消息到数据库
//    b. 创建占位助手消息
//    c. 提取代码库上下文
//    d. 构建 AI 请求
//    e. 调用 AI 模型
//    f. 处理流式响应
//    g. 更新数据库和前端
//    h. 处理 dyad 标签并应用更改

// 4. 如果用户中途取消：
await ipcRenderer.invoke("chat:cancel", chatId);

//    chat:cancel 处理器执行：
//    a. 中止流
//    b. 保存部分响应
//    c. 清理资源
```

---

## 错误处理

### 流处理错误

```typescript
try {
  const result = await processStreamChunks({
    fullStream,
    fullResponse,
    abortController,
    chatId,
    processResponseChunkUpdate
  });
} catch (error) {
  if (abortController.signal.aborted) {
    // 处理取消情况
    const partial = partialResponses.get(chatId);
    await savePartialResponse(partial);
    return;
  }
  // 处理其他错误
  throw error;
}
```

### 文件处理错误

```typescript
try {
  await writeFile(filePath, Buffer.from(base64Data, "base64"));
} catch (error) {
  logger.error(`Error writing file: ${error}`);
  // 继续处理其他文件
}
```

### AI 请求错误

AI SDK 的 `onError` 回调处理：
```typescript
onError: (error: any) => {
  logger.error("AI stream text error:", error);
  safeSend(event.sender, "chat:response:error", {
    chatId: req.chatId,
    error: `${AI_STREAMING_ERROR_MESSAGE_PREFIX}${message}`
  });
  activeStreams.delete(req.chatId);
}
```

---

## 最佳实践

1. **中止信号处理**
   - 始终检查 `abortController.signal.aborted`
   - 在长时间操作中提前退出
   - 清理部分状态

2. **资源清理**
   - 使用 `finally` 块确保清理
   - 删除临时文件
   - 清理状态映射

3. **错误恢复**
   - 保存部分响应以防中断
   - 提供有意义的错误消息
   - 使用 telemetry 追踪问题

4. **性能优化**
   - 批量数据库更新（每 150ms）
   - 使用虚拟文件系统进行预览
   - 限制上下文大小

5. **安全**
   - 验证所有用户输入
   - 转义 XML 和特殊字符
   - 要求用户同意 MCP 工具执行

---

## 相关文件

- `src/ipc/ipc_client.ts` - IPC 客户端
- `src/preload.ts` - 预加载脚本，定义 IPC allowlist
- `src/ipc/ipc_host.ts` - IPC 主机
- `src/utils/codebase.ts` - 代码库提取工具
- `src/ipc/processors/response_processor.ts` - 响应处理器
- `src/hooks/useStreamChat.ts` - 前端流式聊天 Hook

---

## 版本信息

- 文件路径: `src/ipc/handlers/chat_stream_handlers.ts`
- 最后更新: 2026-01-04
- 总行数: 1766

