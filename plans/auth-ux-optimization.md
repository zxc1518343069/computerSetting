# 认证体验与路由守卫优化方案 (Auth UX & Middleware)

## 1. 问题诊断 (Problem Statement)

目前系统使用 `localStorage` + `useEffect` 进行路由拦截，存在以下问题：

- **跳转闪烁**：由于 `localStorage` 仅在客户端可用，Next.js 服务端无法预知登录状态，导致页面先渲染登录框，再由 JS
  执行跳转，产生明显的视觉停顿。
- **逻辑分散**：每个受保护的页面或布局都需要手动编写 `useEffect` 检查逻辑，难以维护。

---

## 2. 最佳实践方案：Middleware + Cookies

利用 Next.js 的中间件（Middleware）在服务端进行拦截，实现“零闪烁”重定向。

### 2.1 核心机制

1. **存储迁移**：将登录凭证从 `localStorage` 迁移到 **Cookies**。Cookies 会随 HTTP 请求自动发送到服务端。
2. **中间件拦截**：在请求到达页面组件之前，中间件读取 Cookies 并决定是允许访问、重定向到登录页，还是重定向到仪表盘。

---

## 3. 架构设计 (Architecture)

### 3.1 API 层改造

- **`POST /api/auth/login`**: 验证成功后，使用 `cookies().set()` 设置会话 Cookie。
- **`POST /api/auth/logout`**: 新增退出接口，用于清除服务端 Cookie。

### 3.2 中间件实现 (`middleware.ts`)

在根目录创建中间件，逻辑如下：

- 匹配路径：`/admin/:path*`
- **场景 A**：访问 `/admin` (登录页) 且 **已登录** -> 立即重定向到 `/admin/dashboard`。
- **场景 B**：访问 `/admin/dashboard/:path*` 且 **未登录** -> 立即重定向到 `/admin`。

### 3.3 视图层简化

- **`app/admin/page.tsx`**: 移除 `useEffect` 中的跳转逻辑。
- **`app/admin/dashboard/layout.tsx`**: 移除 `useEffect` 中的状态检查。

---

## 4. 实施步骤 (Implementation Steps)

### Step 1: 升级登录 API

修改 `app/api/auth/login/route.ts`，在成功响应中注入 Cookie。支持 `remember` 选项设置不同的过期时间。

### Step 2: 编写中间件

在项目根目录创建 `middleware.ts`，统一管理 `/admin` 及其子路由的访问权限。

### Step 3: 实现退出 API

创建 `app/api/auth/logout/route.ts`，确保服务端 Cookie 被彻底清除。

### Step 4: 清理前端冗余代码

移除各组件中基于 `localStorage` 的重定向逻辑，改用 API 驱动的登录/退出。

---

## 5. 方案优势

- **极致体验**：服务端直接重定向，用户感知不到任何中间状态，无闪烁。
- **高安全性**：使用 `httpOnly` Cookies 可以有效防止 XSS 攻击获取登录凭证。
- **集中管理**：所有路由守卫逻辑集中在 `middleware.ts`，一目了然。

---
*方案创建时间：2026-02-13*
