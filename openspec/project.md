# Project Context

## Purpose
这是一个基于Electron的桌面应用程序，集成了AI助手功能。应用采用安全IPC架构，将前端React应用与后端Node.js主进程分离，支持本地AI代理、对话流处理等功能。

## Tech Stack
- **前端**: React + TypeScript + TanStack Router
- **后端**: Node.js + Electron (主进程/渲染进程)
- **数据层**: SQLite + Drizzle ORM
- **状态管理**: TanStack Query + Jotai
- **通信**: Electron IPC (安全进程间通信)
- **构建工具**: Vite + TypeScript

## Project Conventions

### Code Style
- 使用TypeScript严格模式
- 模块化架构，清晰的文件组织结构
- IPC通信遵循预定义的handler模式
- 错误处理统一使用throw new Error()模式

### Architecture Patterns
- **IPC架构**: 主进程处理业务逻辑，渲染进程只负责UI展示
  - `ipc_client.ts`: 渲染进程IPC客户端
  - `preload.ts`: IPC安全白名单
  - `ipc_host.ts`: 主进程处理器注册
  - `handlers/`: 具体业务处理器实现
- **React集成**: TanStack Query处理异步操作
  - useQuery包装读取操作
  - useMutation包装写入操作
  - 成功后自动刷新相关查询
- **数据流**: IPC → TanStack Query → React组件

### Testing Strategy
- 组件级测试与业务逻辑测试并重
- 重点测试IPC边界和数据流
- 遵循"测试现有行为"的原则

### Git Workflow
- 基于OpenSpec的规范驱动开发流程
- 大功能变更需要创建change proposal
- 小修复和格式化可以直接提交

## Domain Context
这是一个AI集成桌面应用，主要处理：
- 本地AI代理管理
- 对话流处理
- 工具集成和执行
- 用户界面交互

AI助手需要理解Electron安全约束和IPC通信模式。

## Important Constraints
- **Electron安全**: 严格的进程隔离，渲染进程无直接文件系统访问
- **IPC安全**: 所有跨进程通信必须通过预定义的白名单
- **性能**: 保持应用响应性，避免阻塞UI线程
- **数据一致性**: 通过TanStack Query缓存和失效机制维护

## External Dependencies
- **AI服务**: 集成各种AI模型和API
- **地图服务**: 百度地图API集成
- **文档查询**: Context7文档检索服务
