# 后台账号管理与操作人记录方案（轻量版）

## 1. 背景

当前后台登录账号仍在 `app/api/auth/login/route.ts` 中硬编码：

- 用户名：`yangshuhao`
- 密码：`wangman`
- 登录成功后只写入 `admin_session=true` 和 `is_admin=true` Cookie

这能判断“有没有登录”，但不知道“是谁登录的”。后续保存订单、结算、入库等操作如果要记录操作者，就需要把当前登录用户解析出来。

本项目主要是 NAS 私有部署给朋友使用，不需要复杂权限、JWT 刷新、服务端 session 表这类重型方案。第一版目标是：账号可管理、`yangshuhao` 是超级管理员、普通账号可登录后台，并且后端 API 能拿到当前操作者。

## 2. 目标

- 后台账号从硬编码切换为数据库存储。
- 新增“账号管理”后台入口，仅 `admin` 可见。
- `yangshuhao` 初始化为超级管理员，保持原密码 `wangman` 可登录。
- 超级管理员可以新增、编辑、启用、禁用账号。
- 登录后 Cookie 中携带轻量身份信息，后端能解析当前用户。
- 保存订单时自动写入“谁保存的”。
- 密码使用 `bcryptjs` 哈希保存，接口不返回 `password_hash`。

## 3. 不做什么

- 不做服务端 session 表。
- 不做复杂 JWT 刷新机制。
- 不做细粒度菜单权限。
- 不做登录失败锁定、验证码、二次验证。
- 不做完整审计日志。

## 4. 角色

| 角色 | 含义 | 权限 |
| :--- | :--- | :--- |
| `admin` | 超级管理员 | 可以访问所有后台功能，额外可以管理账号 |
| `staff` | 普通账号 | 可以访问现有后台业务功能，不能管理账号 |

第一版只区分这两个角色。新增账号默认 `staff`。

## 5. 数据库设计

### 5.1 后台账号表

新增 `admin_users`，写入 `lib/db/schema.sql`，并在 `lib/db/index.ts` 的兼容迁移中确保旧库也会创建。

```sql
CREATE TABLE IF NOT EXISTS admin_users
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role_status
    ON admin_users(role, status);
```

### 5.2 订单操作人字段

为了满足“保存订单时带上是谁保存的”，第一版先给 `sales_orders` 增加两个字段：

```sql
ALTER TABLE sales_orders ADD COLUMN created_by_user_id INTEGER;
ALTER TABLE sales_orders ADD COLUMN created_by_username TEXT;
```

在新建库的 `CREATE TABLE IF NOT EXISTS sales_orders` 中同步加入：

```sql
created_by_user_id INTEGER,
created_by_username TEXT,
```

说明：

- `created_by_user_id` 用于关联账号。
- `created_by_username` 做冗余快照，即使以后账号改名，订单上也还能看到当时是谁保存的。
- 第一版只记录“创建/保存订单的人”。后续如果需要，可以再扩展 `updated_by_user_id`、`settled_by_user_id` 等字段。

### 5.3 默认超级管理员初始化

在 `lib/db/index.ts` 中增加初始化逻辑：

- 如果不存在 `yangshuhao`，插入该账号。
- `password_hash` 使用 `bcryptjs.hashSync('wangman', 10)` 生成。
- `role = 'admin'`。
- `status = 'active'`。
- 如果 `yangshuhao` 已存在，只确保它是 `admin`，不要覆盖已有密码。

## 6. Cookie 与当前用户解析

### 6.1 Cookie 设计

登录成功后，不再只设置 `admin_session=true`。建议设置：

- `admin_session`：`httpOnly`，保存签名后的用户身份。
- `is_admin=true`：非 `httpOnly`，兼容现有前端登录状态判断。
- `admin_role=admin|staff`：非 `httpOnly`，只用于前端隐藏或显示菜单。

`admin_session` 建议使用轻量签名格式：

```txt
base64url({ id, username, role }).hmac_signature
```

签名使用 Node `crypto` 和环境变量 `AUTH_SECRET`。如果没有配置 `AUTH_SECRET`，NAS 私有部署可以 fallback 到一个本地默认值，但生产部署建议明确配置。

这样不用建 `admin_sessions` 表，也不用 JWT 库，同时能避免用户随便改 Cookie 把自己伪造成 `admin`。

### 6.2 新增认证工具

新增 `lib/auth/currentUser.ts`，集中做 Cookie 解析：

```typescript
export interface CurrentAdminUser {
    id: number;
    username: string;
    role: 'admin' | 'staff';
}

export function signAdminCookie(user: CurrentAdminUser): string;
export function parseAdminCookie(value?: string): CurrentAdminUser | null;
export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null>;
export async function requireAdminUser(): Promise<CurrentAdminUser>;
export async function requireSuperAdmin(): Promise<CurrentAdminUser>;
```

职责：

- `signAdminCookie`：登录成功后生成 `admin_session` 值。
- `parseAdminCookie`：校验签名并解析用户身份。
- `getCurrentAdminUser`：从 `cookies()` 读取并解析当前用户。
- `requireAdminUser`：要求已登录，未登录时给业务 API 返回 401。
- `requireSuperAdmin`：要求 `role = 'admin'`，否则返回 403。

为了让禁用账号尽快失效，涉及敏感操作时可以在 `requireAdminUser` 中按 `id` 查一次 `admin_users`，确认账号仍是 `active`。这比 session 表简单很多，但足够稳。

## 7. 认证接口改造

### 7.1 `POST /api/auth/login`

修改 `app/api/auth/login/route.ts`：

- 按 `username` 查询 `admin_users`。
- 账号不存在、账号禁用、密码错误，统一返回 `账号或密码错误`。
- 使用 `bcrypt.compare(password, password_hash)` 校验密码。
- 登录成功后更新 `last_login_at`。
- 设置签名后的 `admin_session`。
- 设置 `is_admin=true`。
- 设置 `admin_role=user.role`。
- 返回 `{ id, username, role }`。

### 7.2 `POST /api/auth/logout`

修改 `app/api/auth/logout/route.ts`：

- 清除 `admin_session`。
- 清除 `is_admin`。
- 清除 `admin_role`。

### 7.3 `GET /api/auth/me`

新增当前用户接口：

- 解析 `admin_session`。
- 成功返回 `{ id, username, role }`。
- 未登录或签名无效返回 401。

前端菜单可以调用这个接口拿角色；也可以先用 `admin_role` 做快速展示，再用 `/api/auth/me` 校准。

## 8. 中间件放什么

`middleware.ts` 继续保持轻量，只做基础门禁：

- 没有 `admin_session` 不能进 `/admin/dashboard`。
- 没有 `admin_session` 不能调用受保护写接口。

不要在 middleware 里查 SQLite，也不要把完整账号权限逻辑放进去。真正的当前用户解析放在 API 里的 `requireAdminUser()` / `requireSuperAdmin()`。

原因：

- middleware 适合轻量判断。
- 项目使用 `better-sqlite3`，不适合在 middleware 里做数据库查询。
- 订单保存、账号管理这类业务 API 本身就应该做后端权限兜底。

## 9. 保存订单时记录操作者

修改 `app/api/orders/route.ts` 的 `POST`：

```typescript
const currentUser = await requireAdminUser();
```

插入 `sales_orders` 时增加：

```sql
created_by_user_id,
created_by_username,
```

对应值：

```typescript
created_by_user_id: currentUser.id,
created_by_username: currentUser.username,
```

序列化订单时也返回：

```typescript
created_by_user_id: row.created_by_user_id,
created_by_username: row.created_by_username,
```

后台订单列表可增加一列“保存人”，展示 `created_by_username || '-'`。

## 10. 账号管理 API

因为项目已经有财务用的 `/api/accounts`，后台账号接口建议叫 `/api/admin-users`。

### 10.1 `GET /api/admin-users`

仅 `admin` 可访问，调用 `requireSuperAdmin()`。

返回：

- `id`
- `username`
- `role`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

不返回 `password_hash`。

### 10.2 `POST /api/admin-users`

仅 `admin` 可访问。

请求体：

```json
{
    "username": "new_user",
    "password": "123456",
    "role": "staff",
    "status": "active"
}
```

规则：

- 用户名必填且唯一。
- 密码第一版至少 6 位即可。
- 角色默认 `staff`。
- 状态默认 `active`。

### 10.3 `PUT /api/admin-users/[id]`

仅 `admin` 可访问。

可编辑：

- 用户名。
- 密码，选填；为空则不改密码。
- 角色。
- 状态。

保护规则：

- 不能禁用最后一个 `active admin`。
- 不能把最后一个 `active admin` 降级为 `staff`。
- 用户名不能重复。

### 10.4 删除策略

第一版不做物理删除，用“禁用/启用”即可。这样历史订单里的 `created_by_user_id` 不会因为账号被删而变得尴尬。

## 11. 后台页面与菜单

### 11.1 菜单入口

修改 `app/admin/dashboard/layout.tsx`：

- 读取 `admin_role` 或调用 `/api/auth/me`。
- 角色为 `admin` 时显示“系统管理 / 账号管理”。
- 路径：`/admin/dashboard/system/accounts`。

菜单隐藏只是体验层，真正权限仍由 `/api/admin-users` 的 `requireSuperAdmin()` 保证。

### 11.2 账号管理页

新增 `app/admin/dashboard/system/accounts/page.tsx`。

功能：

- 表格展示账号。
- 搜索用户名。
- 筛选角色、状态。
- 新增账号。
- 编辑账号。
- 重置密码。
- 启用/禁用账号。

使用 antd：`Table`、`Button`、`Modal`、`Form`、`Input`、`Select`、`Tag`、`Popconfirm`、`message`。

## 12. 类型与服务层

### 12.1 类型

更新 `const/types.ts`：

```typescript
export type AdminRole = 'admin' | 'staff';
export type AdminUserStatus = 'active' | 'disabled';

export interface AdminUser {
    id: number;
    username: string;
    role: AdminRole;
    status: AdminUserStatus;
    last_login_at?: string | null;
    created_at?: string;
    updated_at?: string;
}
```

订单类型增加：

```typescript
created_by_user_id?: number | null;
created_by_username?: string | null;
```

### 12.2 服务层

扩展 `app/services/auth.ts`：

- `login`
- `logout`
- `me`

新增 `app/admin/dashboard/system/accounts/services.ts`：

- `getAdminUsers`
- `createAdminUser`
- `updateAdminUser`
- `toggleAdminUserStatus`

## 13. 开发顺序

1. 更新 `lib/db/schema.sql`，新增 `admin_users`，给 `sales_orders` 增加保存人字段。
2. 更新 `lib/db/index.ts`，增加兼容迁移和 `yangshuhao` 超级管理员初始化。
3. 新增 `lib/auth/currentUser.ts`，实现签名 Cookie、解析当前用户、权限 helper。
4. 改造 `app/api/auth/login/route.ts` 和 `app/api/auth/logout/route.ts`。
5. 新增 `app/api/auth/me/route.ts`。
6. 新增 `app/api/admin-users/route.ts` 和 `app/api/admin-users/[id]/route.ts`。
7. 改造 `app/api/orders/route.ts`，保存订单时写入当前操作者。
8. 后台订单列表增加“保存人”列。
9. 更新后台 layout，只有 `admin` 显示账号管理入口。
10. 新增账号管理页面。
11. 跑 lint/build 并手动验收。

## 14. 验收标准

- `yangshuhao / wangman` 可以正常登录。
- `yangshuhao` 登录后能看到“账号管理”。
- `yangshuhao` 可以新增普通账号。
- 普通账号可以登录后台，但看不到“账号管理”。
- 普通账号直接请求 `/api/admin-users` 返回 403。
- 禁用账号不能登录。
- 系统不允许禁用或降级最后一个可用超级管理员。
- 保存订单时，订单记录中带有当前登录用户的 `created_by_user_id` 和 `created_by_username`。
- 后台订单列表能看到“保存人”。
- 所有账号相关接口都不返回 `password_hash`。

## 15. 检查命令

```bash
npm run lint
npm run build
```

