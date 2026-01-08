## 1. 系统提示集成OpenSpec

- [x] 1.1 更新local_agent_prompt.ts，添加OpenSpec工作流程章节
- [x] 1.2 在prompt中包含OpenSpec决策树（何时需要提案）
- [x] 1.3 添加OpenSpec CLI命令使用指南
- [x] 1.4 包含提案创建、验证和归档的最佳实践
- [x] 1.5 添加OpenSpec规范引用和格式要求

## 2. OpenSpec CLI工具集成

- [x] 2.1 在tool_definitions.ts中添加run_openspec_command工具
- [x] 2.2 实现对openspec list命令的支持
- [x] 2.3 实现对openspec validate命令的支持
- [x] 2.4 实现对openspec show命令的支持
- [x] 2.5 添加命令执行结果解析和用户友好的展示

## 3. 工作流程集成

- [x] 3.1 创建openspec_workflow.ts工具函数
- [x] 3.2 实现changeRequiresProposal识别函数
- [x] 3.3 添加generateChangeId和提案创建指导
- [ ] 3.4 集成到local_agent_handler.ts的主流程
- [ ] 3.5 添加提案验证和归档提醒功能

## 4. 用户交互增强

- [x] 4.1 在local_agent_handler中集成OpenSpec检查
- [x] 4.2 实现变更请求时的自动提案建议
- [ ] 4.3 添加OpenSpec工作流程状态报告
- [ ] 4.4 增强错误处理和用户指导

## 5. 测试和验证

- [ ] 5.1 测试OpenSpec工具执行和错误处理
- [ ] 5.2 验证决策树逻辑的准确性
- [ ] 5.3 测试提案创建和验证工作流程
- [ ] 5.4 验证整体集成后的行为一致性
