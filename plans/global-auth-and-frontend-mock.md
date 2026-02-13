# 全局身份感知与前端演示模式方案 (Global Auth & Frontend Mock)

## 1. 核心目标 (Objectives)

- **身份感知**：建立全局可用的登录状态判断机制。
- **请求分离**：
    - **未登录**：直接使用前端本地 Mock 数据，不发起任何业务 API 请求。
    - **已登录**：发起 API 请求获取真实数据库数据。
- **架构纯净化**：后端 API 移除所有 Mock 逻辑，仅保留真实业务和权限校验。

---

## 2. 技术实现方案 (Implementation)

### 2.1 全局身份中心 (Auth Context)

- **AuthProvider**：在 `app/_components/AuthProvider.tsx` 创建上下文。
    - **状态维护**：`isLoggedIn` (boolean)。
    - **初始化**：挂载时读取 `is_admin` Cookie。
    - **方法提供**：提供 `checkAuth` 方法手动触发状态刷新。
- **useAuth Hook**：封装 `useContext(AuthContext)`，供业务组件便捷调用。

### 2.2 数据中心化 (Mock Data Centralization)

- 将原本散落在 API 路由中的 `MOCK_PRODUCTS` 和 `MOCK_PACKAGES` 提取到 `@/const/mockData.ts` 中，供前端 Hook 统一调用。

### 2.3 业务 Hook 改造 (Smart Fetching)

改造所有涉及数据获取的 Hook，确保前台页面完美适配：

- **useProductList / usePackageTableData**：已初步改造，需确保 `MOCK_PRODUCTS` 字段完整。
- **usePackages (侧边栏)**：需新增改造，引入 `useAuth` 拦截未登录请求，返回 `MOCK_PACKAGES`。
- **usePricing**：已改造，确保 401 时静默切换。

### 2.4 前台页面适配 (Home Page Adaptation)

- **PCPartsTable**：作为前台核心，需确保其子组件在 `isLoggedIn` 为 false 时，UI 上能有明确的“演示模式”暗示（可选），且数据加载无报错。

---

## 3. 实施步骤 (Implementation Steps)

### Step 1: 完善 Mock 数据中心

更新 `@/const/mockData.ts`，补全所有缺失字段（`selling_price`, `is_use_premium`, `updated_at` 等）。

### Step 2: 改造侧边栏 Hook

修改 `app/_components/PCPartsTable/PackageRecomment/hooks/usePackages.ts`。

### Step 3: 验证前台流程

确保在清除 Cookie（模拟访客）的情况下，首页能瞬间加载 Mock 数据且无 401 报错。

---

## 4. 方案优势

- **零延迟**：访客访问时无网络等待，体验极佳。
- **省流量**：大幅减少服务器带宽消耗。
- **易维护**：Mock 数据和真实数据逻辑完全隔离，互不干扰。

---
*方案创建时间：2026-02-13*
