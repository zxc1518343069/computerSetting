# SiteHeader 功能增强与 UI 深度重构方案 (Cyber-Refined 2.0)

## 1. 核心目标 (Objectives)

- **导航扩展**：增加“价格方案”入口（SaaS 宣传页）及“去配置”核心行动按钮 (Primary CTA)。
- **身份感知导航**：采用“渐进式暴露”策略，仅在登录后将“管理后台”提升至导航栏，兼顾商家品牌感与 SaaS 操作效率。
- **身份集成**：对接 `AuthProvider`，实现用户状态感知，右上角保留极简的状态显示与注销功能。
- **品牌解耦**：抽象品牌文字配置，支持“明远装机”名称自定义。
- **视觉重塑**：利用纯 CSS/Tailwind 实现具有“物理感”的赛博精炼质感。

---

## 2. UI/UX 交互深度思考 (Interaction Design)

### 2.1 身份感知导航 (Identity-Aware Navigation)

为了平衡“商家工具”的纯净感与“SaaS 系统”的效率：

- **访客模式 (Merchant-Facing)**：导航栏仅显示 `[装机配置] [游戏榜单] [价格方案]`。保持界面专业且专注于业务转化。
- **管理模式 (SaaS-Workspace)**：登录后，导航栏动态插入 `[管理后台]`。
    - **设计意图**：管理员登录后，系统从“展示模式”切换为“工作模式”，提供最短的操作路径。
    - **视觉暗示**：在“管理后台”前增加微弱的分隔符，区分公共内容与管理功能。

### 2.2 视觉优先级 (Visual Hierarchy)

1. **核心行动点 (去配置)**：全场唯一实色渐变按钮，引导用户进入装机工具。
2. **功能导航**：标准导航样式。
3. **工具入口 (用户状态)**：位于右上角，已登录显示头像，未登录显示极简的“登录”文字。

---

## 3. 详细功能设计 (Detailed Design)

### 3.1 品牌配置 (Brand Config)

```typescript
const BRAND_CONFIG = {
    name: "明远装机",
    subName: "Workshop Pro"
};
```

### 3.2 导航项配置 (Navigation Items)

- **装机配置** (`/`)
- **游戏榜单** (`/gamesList`)
- **价格方案** (`/pricing`)
- **管理后台** (`/admin/dashboard`) - **仅在 `isLoggedIn` 为 true 时显示**

### 3.3 用户系统 (User Section)

- **未登录**：显示“登录”文字链接，点击跳转至 `/admin`。
- **已登录**：显示用户头像，下拉菜单保留“退出登录”。

---

## 4. 技术实现路径 (Implementation Path)

### Step 1: 导航逻辑重构

- 在 `SiteHeader.tsx` 中定义导航数组。
- 使用 `useAuth` 动态过滤导航项。

### Step 2: 视觉打磨

- 使用 Tailwind `after:` 伪元素实现 Header 底部的极细玻璃折射边框。
- 为“去配置”按钮添加 `active:scale-95` 的物理反馈。

### Step 3: 逻辑集成

- 实现 `handleLogout`，调用 `authService.logout` 并刷新 `checkAuth`。
- 确保“去配置”按钮点击后能正确跳转。

---

## 5. 待确认事项 (Discussion)

1. **价格方案页**：是否需要我同步创建一个基础的 SaaS 价格方案展示模板？
2. **去配置锚点**：点击该按钮是直接跳转到首页顶部，还是需要滚动到特定的装机表格位置？
