# 管理后台登录逻辑重构方案 (Auth Refactoring)

## 1. 目标 (Objectives)

- **消除前端硬编码**：将账号密码校验逻辑从客户端迁移至服务端 API。
- **标准化服务层**：建立统一的认证服务接口，符合项目现有的分层架构。
- **提升安全性**：为未来接入数据库存储、JWT 令牌校验和 Session 管理打下基础。

---

## 2. 架构设计 (Architecture)

### 2.1 API 设计 (Backend)

- **Endpoint**: `POST /api/auth/login`
- **功能**: 接收用户名和密码，返回验证结果。
- **逻辑**:
    - 初始阶段：在 API 路由内部硬编码账号密码（与原前端逻辑一致）。
    - 响应格式：遵循 `lib/request/apiResponse.ts` 规范。
    - 状态码：成功返回 200，失败返回 401 (Unauthorized) 或 400 (Bad Request)。

### 2.2 服务层 (Service Layer)

- **文件**: `app/services/auth.ts`
- **职责**:
    - 封装 `login` 函数，调用 `/api/auth/login`。
    - 处理登录成功后的本地存储逻辑（`localStorage` / `sessionStorage`）。

### 2.3 视图层 (UI Layer)

- **文件**: `app/admin/page.tsx`
- **变更**:
    - 移除 `handleLogin` 中的硬编码校验。
    - 调用 `authService.login` 并根据返回结果进行路由跳转。

---

## 3. 实施步骤 (Implementation Steps)

### Step 1: 创建 API 路由

新建 `app/api/auth/login/route.ts`：

- 实现 `POST` 方法。
- 校验请求体中的 `username` 和 `password`。
- 使用 `success` 或 `error` 函数返回标准响应。

### Step 2: 封装认证服务

新建 `app/services/auth.ts`：

- 定义 `login` 请求函数。
- 在 `app/services/index.ts` 中导出。

### Step 3: 改造登录页面

修改 `app/admin/page.tsx`：

- 引入 `authService`。
- 更新 `handleLogin` 逻辑，使用异步请求替代本地校验。
- 保持现有的“7天免登录”逻辑（通过 `remember` 字段控制存储位置）。

---
*方案创建时间：2026-02-13*
