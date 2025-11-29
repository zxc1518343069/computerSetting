# GEMINI 项目上下文文档

> **文档说明**: 本文件记录了项目的核心架构规范、设计系统原则以及开发进度。AI 助手在每次会话开始时应优先阅读此文件，以保持代码风格和逻辑的一致性。

## 1. 核心架构优化策略 (Architecture Guidelines)

本项目采用严格的分层架构，旨在实现视图与逻辑的解耦。

### 1.1 分层架构 (Layered Architecture)

* **Service 层 (`services.ts`)**:
    * **职责**: 负责所有与后端 API 的交互（封装 `fetch`）。
    * **规范**: 严禁在 UI 组件或 Hooks 中直接书写 `fetch` 请求。必须定义强类型的参数和返回值。
* **Hooks 层 (`hooks/*.ts`)**:
    * **职责**: 封装业务逻辑、状态管理（使用 `ahooks`）、数据筛选与副作用。
    * **规范**: 将零散的 `useState`（如搜索条件）合并为对象管理。
* **Types 层 (`types.ts`)**:
    * **职责**: 集中管理 TypeScript 接口定义。
    * **规范**: 消除 `any` 类型，确保类型安全。
* **UI 组件层 (`components/*.ts`)**:
    * **Smart Modals**: 模态框必须使用 `forwardRef` + `useImperativeHandle` 暴露 `open/close` 方法，实现自我状态管理，父组件只持有
      `ref`。
    * **Dumb Components**: 纯展示组件，仅通过 Props 接收数据。

## 2. UI/UX 设计规范 (Design System)

本项目追求 **"现代、精致、富有科技感"** 的视觉风格。

* **核心原则**:
    * **拒绝刻板**: 避免使用默认的 Ant Design 边框和布局，多用自定义的 Tailwind 类进行修饰。
    * **卡片化**: 使用 `rounded-2xl` 大圆角 + `shadow-sm` + `ring-1` (微边框) 替代粗边框。
    * **通透感**: 善用 `bg-white/80` + `backdrop-blur` 营造层次感。
    * **色彩**: 使用高饱和度渐变色 (`blue-600` to `purple-600`) 点缀关键信息（价格、标题）。
* **交互细节**:
    * 操作按钮常驻显示，避免鼠标悬停才出现的糟糕体验（尤其在触控设备上）。
    * 输入框在表格中尽量轻量化，但必须保留边框以明确交互区域。
    * 底部价格栏需突出展示，采用并排布局，增强视觉冲击力。

## 3. 项目目录结构说明 (Project Structure)

为了辅助理解架构，以下是关键目录的职责划分：

```
app/
├── _components/            # 前端用户界面组件 (装机报价表)
│   └── PCPartsTable/       # 核心装机表格模块
├── admin/
│   └── dashboard/
│       ├── config/         # [重构完成] 硬件基础配置管理 (CRUD)
│       ├── packages/       # [重构完成] 套餐管理 (核心业务)
│       │   ├── components/ # UI 组件 (PackageCard, PackageModal, EditableTable)
│       │   ├── hooks/      # 业务逻辑 Hook (usePackageList, usePricing)
│       │   ├── services.ts # API 请求层
│       │   └── types.ts    # 类型定义
│       └── import/         # [重构完成] Excel 导入导出模块
├── api/                    # Next.js API Routes (后端逻辑)
├── const/                  # 全局常量 (如配件分类定义)
└── lib/                    # 基础库 (Supabase 客户端, 工具函数)
```

## 4. 模块化重构记录

* **配置管理 (`.../config`)**: 实现了单卡片布局，整合了搜索与列表。
* **导入模块 (`.../import`)**: 实现了大卡片引导式操作，分离了 Excel 解析逻辑。
* **套餐管理 (`.../packages`)**:
    * `PackageCard`: 实现了带渐变封面和核心配置图标列表的卡片。
    * `EditablePackageTable`: 实现了高性能、可复用的动态表格，支持分类指示器和动态价格计算。
    * `TableFooter`: 实现了总价与最终成交价的横向并排展示，带动态箭头指示。

## 5. AI 助手工作流规范 (AI Agent Workflow)

为确保代码质量和沟通效率，AI 助手必须严格遵守以下工作流：

* **语言规范 (Language Requirement)**:
    * 所有回答、解释、Git Commit Message 以及 **代码注释** 必须使用 **中文 (Chinese)**。
* **质量控制 (Quality Control)**:
    * 在任何代码生成或修改完成后，**必须** 运行 `npm run lint` (或项目配置的相应 lint 命令)。
    * 同时，**必须** 运行 `tsc --noEmit` 进行 TypeScript 类型检查。
    * 必须修复所有 Lint 错误和 TypeScript 类型错误后才能视为任务完成。

## 6. 待办事项 (TODO List)

### 优先级：高 (High Priority)

- [ ] **溢价体系深度集成 (Pricing Premium Integration)**:
    * **核心目标**: 将后台配置的溢价规则（Unified / Category-based）统一应用到所有端。
    * **现状**: 目前 `EditablePackageTable` 内部有计算逻辑，但前端展示页可能未同步。
    * **行动**: 封装全局 `usePricingCalculator`，确保套餐总价、详情页单价、前端报价单使用同一套计算公式。

### 优先级：中 (Medium Priority)

- [ ] **分享功能**: 实现配置单生成分享链接或海报图片的功能。
- [ ] **性能优化**: 针对大量配件数据加载时的渲染性能优化。

### 优先级：低 (Low Priority)

- [ ] **暗色模式**: 搭建 Dark Mode 基础架构。
