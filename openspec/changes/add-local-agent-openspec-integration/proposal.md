# Change: Enable Local Agent to Execute OpenSpec Workflows

## Why
Local Agent目前缺乏对OpenSpec工作流程的理解，无法按照规范化的变更管理流程来处理复杂的代码变更。通过让Local Agent理解OpenSpec规范，它可以主动识别何时需要创建变更提案，并在用户请求时按照OpenSpec的标准流程来执行，而不是重新发明一套工具。

## What Changes
- 更新Local Agent系统提示，包含OpenSpec工作流程指导
- 在Local Agent工具集中添加OpenSpec CLI命令调用工具
- 让Local Agent能够识别变更类型并自动应用OpenSpec决策树
- 集成OpenSpec验证和提案管理功能到Local Agent的工作流程中

## Impact
- Affected specs: local-agent
- Affected code: src/prompts/local_agent_prompt.ts, src/pro/main/ipc/handlers/local_agent/tool_definitions.ts
- 新增功能：Local Agent可以执行OpenSpec工作流程，无需额外工具开发
