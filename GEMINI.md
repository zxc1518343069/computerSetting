# GEMINI 项目分析：电脑配件报价系统

## 项目概述

这是一个使用 **Next.js** 构建的全栈 Web 应用，用于创建、管理和定价自定义电脑硬件配置。该应用服务于两类用户：终端用户可以组装电脑配件列表并查看总价；管理员则可以管理商品、预设套餐和定价规则。

前端使用 **React** 和 **TypeScript** 构建，并结合 **Ant Design** 组件库和 **Tailwind CSS** 进行样式设计。后端由 **Supabase
** 提供支持，这是一个基于 PostgreSQL 的后端即服务（BaaS）平台，负责处理数据库和 API。

### 核心功能:

- **配件选择器:** 提供一个用户友好的表格界面，用于从预定义列表中选择组件（如 CPU, GPU, 内存等）。
- **动态定价:** 在选择组件或更改数量时，实时计算总价格。
- **后台管理面板:** 为管理员提供一个独立的区域，用于管理商品、查看预设套餐以及调整定价。
- **数据管理:** 支持从 Excel 文件导入商品数据和下载模板。
- **预设套餐:** 可以创建预设的电脑配件组合（套餐），并向用户推荐。

## 构建与运行

项目使用 `npm` 进行依赖管理。核心命令定义在 `package.json` 文件中。

- **安装依赖:**
  ```bash
  npm install
  ```

- **开发模式下运行:**
  (使用 Next.js 的 Turbopack 以加速开发)
  ```bash
  npm run dev
  ```
  应用将在 `http://localhost:3000` 上可用。

- **生产环境构建:**
  ```bash
  npm run build
  ```

- **启动生产服务器:**
  ```bash
  npm run start
  ```

- **代码检查 (Linting):**
  ```bash
  npm run lint
  ```

### 数据库

项目包含用于数据库管理的自定义脚本：

- `npm run db:init`: 初始化数据库结构。
- `npm run db:test-package`: 用于创建一个测试套餐的脚本。

## 项目结构

```
├── app/
│   ├── _components/        # 核心 React 组件 (例如 PCPartsTable)
│   ├── admin/              # 后台管理页面的组件和路由
│   ├── api/                # Next.js API 路由 (后端逻辑)
│   ├── layout.tsx          # 应用根布局
│   └── page.tsx            # 应用主页
├── const/
│   └── index.ts            # 应用常量 (例如配件分类)
├── database/
│   ├── schema.sql          # 完整的数据库结构 SQL 文件
│   └── setup-rls.sql       # Supabase 的行级安全 (RLS) 策略
├── lib/
│   ├── supabase.ts         # Supabase 客户端初始化和 TypeScript 类型定义
│   └── request/            # Axios 客户端请求配置
├── public/                 # 静态资源
├── package.json            # 项目依赖和脚本
└── next.config.ts          # Next.js 配置文件
```

## 开发规范

- **语言:** 项目主要使用 **TypeScript** 编写。
- **样式:** 结合使用 **Tailwind CSS**（功能优先的 CSS 框架）和 **Ant Design** 组件库来构建界面。
- **代码质量:** 配置了 **ESLint** 用于代码检查，以保持代码风格的一致性。使用 **Prettier** 进行代码格式化。
- **数据库:** 数据库结构通过 `database/schema.sql` 文件进行管理，该文件是数据库结构的唯一真实来源。
- **API:** 后端逻辑通过 Next.js API Routes 实现，位于 `app/api/` 目录下。
- **环境变量:** 应用依赖环境变量（例如，在 `.env.local` 文件中）来配置 Supabase 的访问凭证。