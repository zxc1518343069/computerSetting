# API 权限校验与数据降级方案 (最终版)

## 1. 核心目标 (Objectives)

- **写操作全拦截**：基于“前台无提交”的原则，封死所有未登录状态下的非 GET 请求。
- **读操作分级**：
    - 敏感数据（Pricing）：未登录直接 401，前端兜底。
    - 展示数据（Products/Packages）：未登录返回 Mock 数据，实现演示模式。

---

## 2. API 访问策略 (Access Policy)

| API 路径          | 方法              | 权限要求     | 未登录行为            |
|:----------------|:----------------|:---------|:-----------------|
| `/api/auth/*`   | ALL             | 公开       | 正常访问             |
| `/api/games`    | GET             | 公开       | 正常访问             |
| `/api/products` | GET             | 混合       | **返回全量 Mock 数据** |
| `/api/packages` | GET             | 混合       | **返回全量 Mock 数据** |
| `/api/pricing`  | GET             | 仅限 Admin | **401 (前端静默兜底)** |
| `/api/**`       | POST/PUT/DELETE | 仅限 Admin | **401 (中间件硬拦截)** |

---

## 3. 实施细节 (Implementation)

### 3.1 中间件拦截 (middleware.ts)

- 逻辑：
    1. 排除 `/api/auth`。
    2. 如果是 `POST/PUT/DELETE` -> 检查 `admin_session`，无则 401。
    3. 如果是 `GET` 且路径为 `/api/pricing` -> 检查 `admin_session`，无则 401。

### 3.2 API 路由改造 (Products/Packages)

- 内部逻辑：
    ```typescript
    const session = (await cookies()).get('admin_session');
    if (!session) return success(MOCK_DATA);
    // 否则继续执行数据库查询...
    ```
- **数据对齐**：确保 Mock 数据包含 `selling_price`, `is_use_premium` 等字段。

### 3.3 前端 Hook 改造 (usePricing.ts)

- 捕获 `/api/pricing` 的 401 错误。
- 返回默认配置：`{ unifiedPricing: true, unifiedRate: 0, roundingType: 'none', ... }`。

### 3.4 性能优化：登录状态暗示 (Auth Hint)

- **问题**：由于 `admin_session` 是 `httpOnly` 的，前端无法直接判断是否需要跳过 `/api/pricing` 请求。
- **对策**：
    1. **双 Cookie 策略**：登录成功后，额外设置一个非 httpOnly 的 Cookie `auth_hint=admin`。
    2. **按需请求**：`usePricing` 在发起请求前检查 `auth_hint`。若不存在，则直接使用 `DEFAULT_PRICING_CONFIG`，不再发起网络请求。
    3. **安全性**：`auth_hint` 仅用于前端逻辑分流，后端权限校验仍以 `admin_session` 为准。

---

## 4. 待办事项 (TODO)

- [x] 更新 `middleware.ts` 实现拦截逻辑。
- [x] 完善 `app/api/products/route.ts` 中的 `MOCK_PRODUCTS` 字段。
- [x] 完善 `app/api/packages/route.ts` 中的 `MOCK_PACKAGES` 字段。
- [ ] 修改登录 API，增加 `auth_hint` Cookie。
- [ ] 改造 `usePricing.ts`，根据 `auth_hint` 决定是否发起请求。
- [ ] 修改退出 API，清除 `auth_hint`。

---
*方案更新时间：2026-02-13 (引入 Auth Hint 优化)*
