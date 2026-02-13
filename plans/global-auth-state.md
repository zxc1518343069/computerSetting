# 全局身份感知与按需加载方案 (Global Auth State)

## 1. 核心目标 (Objectives)

- **建立全局身份状态**：让应用中的任何组件都能同步感知“当前是否为管理员”。
- **消除无效请求**：基于身份状态，在客户端直接拦截并跳过注定会失败的 API 请求（如 `/api/pricing`）。
- **提升 UI 一致性**：确保前台和后台的 UI 能够根据登录状态实时响应（例如：前台显示“进入后台”按钮）。

---

## 2. 技术实现方案 (Implementation)

### 2.1 状态源：身份暗示 Cookie (Auth Hint)

由于核心 Session Cookie 是 `httpOnly` 的，我们引入一个非敏感的暗示 Cookie：

- **名称**：`is_admin`
- **特性**：非 `httpOnly`，JS 可读。
- **生命周期**：与 `admin_session` 同步创建和销毁。

### 2.2 全局 Hook：`useAuth`

在 `app/hooks/useAuth.ts` 中封装身份感知逻辑：

```typescript
export const useAuth = () => {
    // 通过读取 'is_admin' Cookie 来判断
    const [isLoggedIn, setIsLoggedIn] = useState(checkIsAdminCookie());

    // 提供刷新状态的方法
    const refresh = () => setIsLoggedIn(checkIsAdminCookie());

    return { isLoggedIn, refresh };
};
```

### 2.3 按需加载逻辑 (Conditional Fetching)

改造 `usePricing` 等 Hook，引入“门控”机制：

- **逻辑**：`const { isLoggedIn } = useAuth();`
- **行为**：如果 `isLoggedIn` 为 `false`，则 `useRequest` 的 `ready` 参数设为 `false`，直接返回默认配置。

---

## 3. 实施步骤 (Implementation Steps)

### Step 1: 后端同步暗示信号

修改 `app/api/auth/login/route.ts` 和 `logout/route.ts`：

- 登录成功：设置 `is_admin=true` Cookie。
- 退出登录：清除 `is_admin` Cookie。

### Step 2: 创建 `useAuth` Hook

实现一个轻量级的 Hook，用于读取 Cookie 状态。

### Step 3: 改造业务 Hook

- **`usePricing`**：仅在 `isLoggedIn` 为 true 时发起请求。
- **`useProductList` / `usePackageList`**：虽然这些接口有 Mock 降级，但也可以利用 `isLoggedIn` 在 UI 上做“演示模式”的文字提示。

---

## 4. 方案优势

- **零性能损耗**：基于 Cookie 的判断是同步的，不需要额外的 `/api/me` 请求。
- **极致纯净**：访客访问时，控制台不再有 401 报错，网络面板只加载必要的数据。
- **全局复用**：未来如果前台需要根据登录状态显示隐藏功能，直接调用 `useAuth` 即可。

---
*方案创建时间：2026-02-13*
