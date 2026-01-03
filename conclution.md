用户输入
↓
[home.tsx: handleSubmit]
创建App → 获取chatId
↓
[useStreamChat.ts: streamMessage]
设置流状态
↓
[ipc_client.ts: streamMessage]
转换附件为base64（如果有）
↓
[ipc_client.ts: invoke("chat:stream")]
跨进程IPC调用
↓
[preload.ts: validInvokeChannels]
白名单验证
↓
[chat_stream_handlers.ts: ipcMain.handle("chat:stream")]
主进程处理请求
↓
[chat_stream_handlers.ts: 处理流程]

1.  保存用户消息到数据库
2.  创建占位助手消息
3.  提取代码库上下文
4.  准备消息历史
    ↓
    [get_model_client.ts: getModelClient]
    获取AI模型客户端（Dyad Engine或直接连接）
    ↓
    [chat_stream_handlers.ts: simpleStreamText]
    构建提供商选项和请求头
    ↓
    [provider_options.ts: getProviderOptions]
    构建提供商特定配置
    ↓
    [chat_stream_handlers.ts: streamText]
    使用Vercel AI SDK发送流式请求到AI提供商
    ↓
    AI提供商（OpenAI/Anthropic/Google等）
    返回流式响应
    ↓
    [chat_stream_handlers.ts: processStreamChunks]
    处理响应块
    ↓
    [ipc_client.ts: onUpdate回调]
    更新UI显示
