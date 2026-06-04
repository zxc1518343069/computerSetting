# 首页保存订单增加经手人选择方案

## 1. 背景

当前首页配置工坊保存订单的流程是：

- 用户在首页选择装机配置。
- 点击“保存订单”打开订单弹窗。
- 填写客户、成交金额、备注。
- 前端调用 `saveOrder()` 提交到 `POST /api/orders`。
- 后端通过 `requireAdminUser()` 获取当前登录账号，并把当前登录人写入订单的 `created_by_user_id` 和 `created_by_username`。

也就是说，现在订单归属人/经手人是“谁当前登录，订单就记到谁名下”。这不适合门店实际场景：可能是管理员登录系统，但订单实际经手人是另一个员工；也可能前台统一用一个设备录单，但需要明确选择业务经手人。

## 2. 目标

- 首页“保存订单”弹窗新增“经手人”下拉选择。
- 经手人从系统账号列表中读取，只展示 `active` 状态账号。
- 经手人为必填项。
- 打开弹窗时默认选中当前登录人，减少正常录单成本。
- 提交订单时，后端以提交的经手人为准写入订单归属字段，不再直接使用当前登录人。
- 后端仍要求当前请求必须已登录，避免未登录用户伪造保存订单。
- 后端校验提交的经手人必须存在且状态为 `active`，不能只相信前端 select。

## 3. 不做什么

- 不调整订单表结构，继续复用现有 `sales_orders.created_by_user_id` 和 `sales_orders.created_by_username`。
- 不新增复杂权限模型。
- 不改变后台账号管理页面的超管权限。
- 不做经手人历史变更功能。
- 不做订单保存后的经手人编辑入口，后续如果业务需要可单独设计。

## 4. 当前代码落点

### 4.1 首页订单弹窗

文件：`app/_components/PCPartsTable/Content/index.tsx`

当前 `handleSaveOrder` 提交字段包括：

```typescript
customer_id
customer_name
customer_phone
save_customer
original_amount
final_amount
source
note
items
```

需要新增：

```typescript
handler_user_id
```

### 4.2 保存订单接口

文件：`app/api/orders/route.ts`

当前创建订单逻辑：

```typescript
const currentUser = await requireAdminUser();
```

并在插入 `sales_orders` 时使用：

```typescript
created_by_user_id: currentUser.id,
created_by_username: currentUser.username,
```

需要改为：

```typescript
const currentUser = await requireAdminUser();
const handlerUser = resolveActiveHandlerUser(db, handler_user_id);
```

插入订单时使用：

```typescript
created_by_user_id: handlerUser.id,
created_by_username: handlerUser.username,
```

其中 `currentUser` 只用于确认“当前请求是否已登录”，不再作为订单经手人。

### 4.3 账号列表接口

文件：`app/api/admin-users/route.ts`

当前 `GET /api/admin-users` 使用 `requireSuperAdmin()`，只允许超级管理员获取账号列表。首页普通员工也需要选择经手人，因此不能直接复用这个接口。

推荐新增一个轻量接口：

```text
GET /api/admin-users/active
```

权限：

- 只要求 `requireAdminUser()`。
- 返回所有 `status = 'active'` 的账号。
- 只返回 select 需要的安全字段：`id`、`username`、`role`。

## 5. 接口设计

### 5.1 获取可选经手人列表

```http
GET /api/admin-users/active
```

返回示例：

```json
[
  {
    "id": 1,
    "username": "yangshuhao",
    "role": "admin"
  },
  {
    "id": 2,
    "username": "xiaoming",
    "role": "staff"
  }
]
```

说明：

- 只返回启用账号。
- 排序建议与账号管理一致：`role ASC, created_at DESC`。
- 不返回 `status`、`password_hash` 等无关或敏感字段。

### 5.2 保存订单

```http
POST /api/orders
```

新增请求字段：

```json
{
  "handler_user_id": 2
}
```

后端校验：

- `handler_user_id` 必填。
- 必须是数字。
- 必须能在 `admin_users` 中找到。
- 对应账号 `status` 必须为 `active`。

错误文案建议：

| 场景 | HTTP 状态 | 文案 |
| :--- | :--- | :--- |
| 未登录 | 401 | 请先登录 |
| 未选择经手人 | 400 | 请选择经手人 |
| 经手人不存在 | 400 | 经手人不存在或已停用 |
| 经手人已停用 | 400 | 经手人不存在或已停用 |

## 6. 前端改造方案

### 6.1 新增 service

在 `app/admin/dashboard/services.ts` 或独立账号 service 中新增：

```typescript
export interface OrderHandlerUser {
    id: number;
    username: string;
    role: AdminRole;
}

export const fetchActiveAdminUsers = () => {
    return api.get<any, OrderHandlerUser[]>('/admin-users/active');
};
```

考虑首页当前已经从 `app/admin/dashboard/services.ts` 引入 `fetchCustomers` 和 `saveOrder`，第一版放这里最少改动。

### 6.2 首页弹窗加载经手人

在 `Content/index.tsx` 中新增：

```typescript
const { data: handlerUsers = [], loading: loadingHandlerUsers } = useRequest(fetchActiveAdminUsers, {
    ready: isLoggedIn,
});
```

配合 `useAuth()` 当前用户信息，弹窗打开时默认填充当前登录人：

```typescript
orderForm.setFieldsValue({
    customer_source: 'new',
    save_customer: true,
    final_amount: finalAmount,
    handler_user_id: currentUser?.id,
});
```

如果当前 `useAuth()` 还没有暴露 `currentUser`，有两个落地选择：

- 推荐：扩展 `AuthProvider`，把 `/api/auth/me` 的用户信息暴露出来。
- 兼容：如果暂时拿不到当前用户，则默认选择列表第一个账号，但仍要求用户可手动改。

推荐第一种，默认值更符合业务直觉。

### 6.3 弹窗新增表单项

位置建议放在客户信息之后、最终成交金额之前：

```tsx
<Form.Item
    name="handler_user_id"
    label="经手人"
    rules={[{ required: true, message: '请选择经手人' }]}
>
    <Select
        showSearch
        placeholder="请选择经手人"
        loading={loadingHandlerUsers}
        optionFilterProp="label"
        options={handlerUserOptions}
    />
</Form.Item>
```

下拉 label 建议：

```text
用户名 / 管理员
用户名 / 员工
```

这样用户能看懂账号角色，但订单归属仍以账号 ID 为准。

### 6.4 保存订单 payload

`saveOrder()` 增加：

```typescript
handler_user_id: values.handler_user_id,
```

完整逻辑保持其他字段不变。

## 7. 后端改造方案

### 7.1 新增 active 用户接口

新增文件：

```text
app/api/admin-users/active/route.ts
```

核心逻辑：

```typescript
await requireAdminUser();

const rows = db.prepare(`
    SELECT id, username, role
    FROM admin_users
    WHERE status = 'active'
    ORDER BY role ASC, created_at DESC
`).all();
```

### 7.2 订单创建时解析经手人

在 `app/api/orders/route.ts` 中新增工具函数：

```typescript
const resolveActiveHandlerUser = (
    db: ReturnType<typeof getDb>,
    handlerUserId: unknown
) => {
    const id = Number(handlerUserId);
    if (!Number.isInteger(id) || id <= 0) throw new Error('HANDLER_REQUIRED');

    const row = db
        .prepare("SELECT id, username, role, status FROM admin_users WHERE id = ?")
        .get(id) as AdminUserRow | undefined;

    if (!row || row.status !== 'active') throw new Error('HANDLER_NOT_FOUND');
    return row;
};
```

`POST` 中解构新增字段：

```typescript
const {
    handler_user_id,
    customer_id,
    customer_name,
    ...
} = await request.json();
```

插入订单前：

```typescript
const handlerUser = resolveActiveHandlerUser(db, handler_user_id);
```

落库改为：

```typescript
created_by_user_id: handlerUser.id,
created_by_username: handlerUser.username,
```

### 7.3 错误处理

新增订单保存错误映射：

```typescript
if (message === 'HANDLER_REQUIRED') return error(400, '请选择经手人');
if (message === 'HANDLER_NOT_FOUND') return error(400, '经手人不存在或已停用');
```

## 8. 兼容与数据影响

- 老订单不受影响，继续显示原来的 `created_by_username`。
- 新订单必须选择经手人。
- `created_by_user_id` 继续保存账号 ID，因此后台订单列表无需大改。
- 如果以后账号改名，订单仍然保留保存当时的 `created_by_username` 快照。
- 如果某账号后续被停用，历史订单不变；新订单不能再选择该账号。

## 9. 验收清单

- 未登录时首页“保存订单”仍不可用或提示登录。
- 已登录后打开“保存订单”弹窗，可以看到“经手人”select。
- 经手人列表只包含启用账号。
- 默认经手人为当前登录账号。
- 可切换为其他启用账号。
- 不选择经手人时不能提交。
- 提交订单后，后台订单列表展示的创建人/经手人为选择的账号，而不是当前登录账号。
- 直接调用接口传不存在的 `handler_user_id` 返回 `经手人不存在或已停用`。
- 停用账号不会出现在下拉列表，也不能通过接口保存为经手人。
- `npm run lint` 通过。

## 10. 推荐实施顺序

1. 新增 `GET /api/admin-users/active`。
2. 新增 `fetchActiveAdminUsers()` service。
3. 扩展 `AuthProvider` 暴露当前用户 ID。
4. 首页订单弹窗新增“经手人”表单项和默认值。
5. `saveOrder()` payload 增加 `handler_user_id`。
6. `POST /api/orders` 改为校验并使用所选经手人。
7. 本地手动验证管理员登录、普通员工登录、经手人切换保存三条链路。
