<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.



# API 调用与业务逻辑 (核心指令)
API 探测优先: 在编写项目前，必要的时候查看 /src/api 目录下的（/area, /location, /task）。严禁在未确认接口结构的情况下盲目编写代码。

无接口不页面: 所有的操作（如下发任务、修改库位）必须对应真实的 API 调用。若接口不存在，必须使用 console.log 模拟并清晰注明“模拟接口”，不要自己捏造接口。

强制日志审计: 每一个 API 调用函数必须按以下格式输出日志，以便调试：
//请求调用前
console.log(`[API Request] 函数名:`, params);
// 返回
console.log(`[API Response] 函数名 Response:`, data);
错误处理: 接口调用失败时，必须使用 toast.error(error.message)，其中 message 必须来源于接口返回。

参数规范: 严格遵守接口定义的结构体，仅传递必要的参数。