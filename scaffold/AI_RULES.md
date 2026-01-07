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


# notice

- 请求调用的接口都在 /api 目录下，分别有/area目录：库区管理相关接口，/location：库位管理相关接口，/task：任务小车相关信息和任务下发接口
- 不要只生成页面，没有接口调用，任何功能都要先去查看是否有对应的接口，没有就直接console.log("模拟xxx接口调用")
- 对于接口调用的函数，把参数和接口返回的信息都console.log 出来，包含函数名称，方便后续排查
- 如果接口调用失败，toast里面直接使用接口返回的message
- 要注意接口的请求参数和返回的结构体，不强制要求的参数不需要传入
- 你需要思考每个接口之间的调用逻辑，确保主要逻辑没有问题