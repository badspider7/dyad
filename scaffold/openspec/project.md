# Project Context

## Purpose
这是一个仓库管理系统（WMS - Warehouse Management System），用于管理仓库、库区、库位以及AGV小车任务调度。系统提供了库位状态管理、任务下发、小车监控等核心功能，帮助用户高效管理仓储物流。

## Tech Stack

### 前端框架与库
- **React 18.3.1** - 核心UI框架
- **TypeScript 5.5.3** - 类型安全的JavaScript超集
- **Vite 6.3.4** - 现代化构建工具
- **React Router DOM 6.26.2** - 客户端路由管理

### UI组件库
- **shadcn/ui** - 基于Radix UI的组件库（已完整安装）
- **Radix UI** - 无样式的可访问性组件基础库
- **Tailwind CSS 3.4.11** - 实用优先的CSS框架
- **Lucide React** - 图标库

### 状态管理与数据获取
- **TanStack Query (React Query) 5.56.2** - 服务端状态管理
- **React Hook Form 7.53.0** - 表单状态管理
- **Zod 3.23.8** - TypeScript优先的模式验证

### HTTP客户端
- **Axios 1.13.2** - Promise based HTTP客户端
- 自定义 `HttpClient` 封装（位于 `src/utils/request.ts`）

### 其他工具库
- **date-fns 3.6.0** - 日期处理
- **sonner** - Toast通知
- **class-variance-authority** - 样式变体管理
- **tailwind-merge** - Tailwind类名合并

## Project Conventions

### 代码风格

#### 命名规范
- **组件文件**: PascalCase (例如: `Index.tsx`, `NotFound.tsx`)
- **工具函数文件**: camelCase (例如: `request.ts`, `toast.ts`)
- **API文件**: camelCase (例如: `index.ts`)
- **类型/接口**: PascalCase (例如: `Response<T>`, `LocationItem`)
- **变量/函数**: camelCase (例如: `getAllAreas`, `httpClient`)
- **常量**: UPPER_SNAKE_CASE 或 camelCase

#### TypeScript配置
- 允许隐式any (`noImplicitAny: false`)
- 允许未使用的参数和局部变量
- 关闭严格空值检查 (`strictNullChecks: false`)
- 允许JavaScript文件 (`allowJs: true`)
- 路径别名: `@/*` 映射到 `./src/*`

#### 样式规范
- **优先使用Tailwind CSS**: 所有样式应使用Tailwind类名
- **组件样式**: 使用 `class-variance-authority` 管理变体
- **样式合并**: 使用 `tailwind-merge` 避免类名冲突
- **响应式设计**: 使用Tailwind的响应式前缀 (sm:, md:, lg:, xl:)

### 架构模式

#### 目录结构
```
src/
├── api/              # API接口定义
│   ├── area/         # 库区相关接口
│   ├── location/     # 库位相关接口
│   └── task/         # 任务相关接口
├── components/       # React组件
│   └── ui/          # shadcn/ui组件（不要修改）
├── hooks/           # 自定义React Hooks
├── lib/             # 工具库
├── pages/           # 页面组件
├── utils/           # 工具函数
│   ├── request.ts   # HTTP客户端封装
│   └── toast.ts     # Toast通知工具
├── App.tsx          # 应用入口和路由配置
└── main.tsx         # React渲染入口
```

#### 组件组织
- **页面组件**: 放在 `src/pages/` 目录
- **可复用组件**: 放在 `src/components/` 目录
- **UI组件**: shadcn/ui组件在 `src/components/ui/`（不要直接修改，需要变化时创建新组件）
- **路由配置**: 所有路由必须在 `src/App.tsx` 中定义

#### API调用模式
- **集中管理**: 所有API调用封装在 `src/api/` 目录下
- **类型安全**: 每个API都有完整的TypeScript类型定义
- **统一响应**: 使用 `Response<T>` 泛型包装响应数据
- **错误处理**: 在 `httpClient` 层统一处理错误

#### 状态管理
- **服务端状态**: 使用 TanStack Query (React Query)
- **表单状态**: 使用 React Hook Form + Zod验证
- **本地UI状态**: 使用 React Hooks (useState, useReducer)

### API调用与业务逻辑规范（核心指令）

#### API探测优先
在编写项目前，**必须**先查看 `/src/api` 目录（`/area`, `/location`, `/task`）。严禁在未确认接口结构的情况下盲目编写代码。

#### 无接口不页面
所有的操作（如下发任务、修改库位）必须对应真实的API调用。若接口不存在，必须使用 `console.log` 模拟并清晰注明"模拟接口"。

#### 强制日志审计
每一个API调用函数必须按以下格式输出日志，以便调试：

```typescript
console.log(`[API Request] 函数名:`, params);
// 成功后
console.log(`[API Success] 函数名 Response:`, data);
```

#### 错误处理
接口调用失败时，必须使用 `toast.error(error.message)`，其中 message 必须来源于接口返回。

#### 参数规范
严格遵守接口定义的结构体，仅传递必要的参数。

### Testing Strategy

#### 测试方法
- **手动测试**: 主要通过浏览器预览进行功能测试
- **类型检查**: 依赖TypeScript编译时类型检查
- **API测试**: 通过实际调用后端接口验证

#### 测试重点
- API调用的正确性（参数、响应处理）
- 表单验证逻辑
- 错误处理和用户反馈
- 响应式布局在不同设备上的表现

### Git Workflow

#### 分支策略
- **main/master**: 生产环境代码
- **develop**: 开发环境代码
- **feature/***: 功能分支
- **bugfix/***: 修复分支

#### 提交规范
使用语义化提交信息：
- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具链更新

## Domain Context

### 业务领域知识

#### 仓库管理层级
1. **仓库 (Warehouse)**: 最顶层，一个物理仓库
2. **库区 (Area)**: 仓库的分区，如"A区"、"B区"
3. **库位 (Location)**: 具体的存储位置，如"A1-01"

#### 库位状态
库位有多种状态（通过 `getAllLocationStates` 获取），例如：
- 空闲
- 占用
- 禁用
- 维护中

#### AGV任务系统
- **任务 (Mission)**: 由多个步骤组成的工作流
- **步骤 (Step)**: 包含目标点位和动作（如load/unload）
- **小车 (Robot)**: 执行任务的AGV设备
- **任务状态**: 排队中(0)、执行中(1)、取消中(4)、完成(5)、取消完成(6)、出错(7)、重置完成(8)

#### 关键业务流程
1. **入库流程**: 创建任务 → 小车到达取货点 → 执行load动作 → 到达库位 → 执行unload动作
2. **出库流程**: 创建任务 → 小车到达库位 → 执行load动作 → 到达卸货点 → 执行unload动作
3. **库位管理**: 查询库位 → 更新状态 → 监控占用情况

## Important Constraints

### 技术约束
- **浏览器兼容性**: 现代浏览器（Chrome, Firefox, Safari, Edge最新版本）
- **TypeScript严格性**: 部分严格检查已关闭，需注意类型安全
- **API依赖**: 前端完全依赖后端API，无本地数据持久化

### 业务约束
- **库位唯一性**: 每个库位的code必须唯一
- **任务优先级**: 0-5级，5为最高优先级
- **小车分配**: 可指定特定小车或小车组执行任务

### 性能约束
- **分页加载**: 列表数据默认每页100条（可配置）
- **请求超时**: 默认30秒超时
- **实时性**: 小车状态需要定期轮询更新

## External Dependencies

### 后端API服务
- **主API服务**: 通过 `VITE_APP_API_BASEURL` 环境变量配置
  - 库区管理: `/area/*`
  - 库位管理: `/location/*`
  
- **调度服务**: AGV任务调度系统（端口8858）
  - 任务管理: `/api/v1/missions`
  - 小车信息: `/api/v1/robots`
  - 任务命令: `/api/v1/mscmds`

- **任务查询服务**: 端口9000
  - 任务列表: `/missions`
  - 需要Basic认证: `root:e10adc3949ba59abbe56e057f20f883e`

### 环境变量
- `VITE_APP_API_BASEURL`: API基础URL（开发环境）
- 生产环境自动使用 `window.location.origin`

### 第三方服务
- 无外部第三方服务依赖（如支付、地图等）
- 所有功能依赖内部API

## Development Guidelines

### 开发流程
1. **需求分析**: 确认功能需求和API接口
2. **接口确认**: 查看 `src/api/` 目录确认接口定义
3. **组件开发**: 创建页面/组件，使用shadcn/ui组件
4. **API集成**: 使用TanStack Query进行数据获取
5. **错误处理**: 添加适当的错误提示和日志
6. **测试验证**: 在浏览器中测试功能

### 最佳实践
- **组件复用**: 优先使用shadcn/ui组件，需要定制时创建新组件
- **类型安全**: 为所有API响应和组件props定义类型
- **错误边界**: 使用try-catch和toast提示用户错误
- **日志记录**: 关键操作添加console.log便于调试
- **响应式设计**: 确保在不同屏幕尺寸下可用
- **性能优化**: 使用React Query的缓存机制减少重复请求

### 禁止事项
- ❌ 不要修改 `src/components/ui/` 下的shadcn组件
- ❌ 不要在未确认接口的情况下编写业务代码
- ❌ 不要忽略TypeScript类型错误
- ❌ 不要在生产代码中留下console.log（调试日志除外）
- ❌ 不要硬编码API URL，使用环境变量

### 代码审查要点
- ✅ API调用是否有完整的类型定义
- ✅ 错误处理是否完善
- ✅ 是否添加了必要的日志
- ✅ 组件是否可复用
- ✅ 样式是否使用Tailwind CSS
- ✅ 是否遵循命名规范
