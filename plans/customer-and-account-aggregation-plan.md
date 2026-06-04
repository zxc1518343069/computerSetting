# 客户信息与账款聚合改造方案

## 1. 背景

当前账款管理已经能展示三类待处理账款：

- 进货待付款
- 供应商待退款
- 销售订单待收款

但现有页面和接口主要按单据维度展示。采购侧按进货单展示，销售侧按销售订单展示。实际对账时，使用者更关心的是：

- 我欠哪个商家多少钱
- 哪个客户还欠多少钱
- 点开后分别是哪几张单

因此账款管理需要增加“往来对象聚合”能力，同时保留当前分笔订单/进货单明细，避免聚合后丢失单据追踪。

另外，当前系统已有 `suppliers` 供应商主数据，但销售侧还没有客户主数据。销售订单里只有 `customer_name` 和
`customer_phone`。如果要稳定支持“按用户/客户维度”做账款、历史订单、对账，建议在销售管理下新增“客户信息”模块。

## 2. 结论

推荐方案：

1. 在销售管理下新增客户信息模块。
2. 财务账款页改为双视图：
   - 往来对象汇总：按商家/客户聚合。
   - 分笔明细：保留当前按进货单、销售订单的明细列表。
3. 聚合行支持展开或抽屉查看分笔单据。
4. 供应商页只增加账款摘要和跳转入口，不把完整财务操作塞进供应商模块。

已确认的第一版边界：

- 客户信息不做隐式自动创建；保存订单时允许显式选择是否保存为客户档案。
- 客户唯一性以手机号为准；保存客户档案时手机号必填且不能重复。
- 聚合视图不做批量付款、批量收款。
- 历史订单迁移先不考虑。
- 账款页默认打开汇总视图。

这样模块边界更清楚：

- 销售管理：客户资料、已关联订单。
- 仓库管理：供应商资料、采购和入库。
- 财务管理：应付、应收、退款、收款和对账。

## 3. 信息架构调整

### 3.1 销售管理

新增菜单：

```text
销售管理
  销售列表
  物品溢价
  套餐配置
  订单列表
  客户信息
```

建议路径：

```text
app/admin/dashboard/sales/customers/
```

页面能力：

- 客户列表
- 新增客户
- 编辑客户
- 搜索客户名称、手机号、微信号、备注
- 查看已关联客户的订单
- 查看客户当前待收账款
- 跳转到账款管理并筛选当前客户

### 3.2 财务管理

账款管理页保留一个入口，页面内部增加视图切换：

```text
财务管理
  账款管理
    往来对象汇总
      应付商家
      应收客户
    分笔明细
      进货应付/退款
      销售待收
```

建议 UI：

- 第一层用 Segmented 或 Tabs 切换 `汇总视图` / `分笔明细`。
- 汇总视图内再分 `应付商家` / `应收客户`。
- 分笔明细内保留当前 `待付` / `待收` 表格，改名更清楚。
- 聚合行展开后展示该商家/客户下的所有未结单据。

## 4. 客户信息模块

### 4.1 数据表

新增 `customers`：

```sql
CREATE TABLE IF NOT EXISTS customers
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    wechat TEXT,
    address TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_name_phone
    ON customers(name, phone);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique
    ON customers(phone)
    WHERE phone <> '';
```

销售订单增加 `customer_id`：

```sql
ALTER TABLE sales_orders ADD COLUMN customer_id INTEGER REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id
    ON sales_orders(customer_id);
```

新建库的 `sales_orders` 建表语句也同步加入 `customer_id`。

### 4.2 订单保存客户策略

新增或编辑销售订单时：

- 客户来源分为 `已有客户` 和 `新客户`。
- 选择 `已有客户` 时，必须选择一个客户，订单写入 `customer_id`，同时保留 `customer_name` / `customer_phone` 快照。
- 选择 `新客户` 时，继续填写客户名称和手机号。
- `新客户` 下增加 `是否保存客户信息` 复选框。
- 勾选 `是否保存客户信息` 时，手机号必填。保存订单的同时创建客户档案，并把新客户 `id` 写入订单 `customer_id`。
- 不勾选 `是否保存客户信息` 时，只保存订单快照，不创建客户档案，订单 `customer_id` 为空。

推荐第一版：

- 前台保存订单弹窗支持 `已有客户` / `新客户` 两种模式。
- 后台订单编辑/结算页同样支持选择或关联客户。
- 客户信息既可以通过销售管理下的客户信息模块维护，也可以在保存订单时显式落档。
- 后端不根据手机号做自动匹配和隐式自动创建，只响应用户在表单里的明确选择。
- `customer_name` 和 `customer_phone` 继续作为订单快照字段保留。

当新客户手机号与已有客户重复时，强制拦截保存客户档案，并提示改选已有客户。用户如果确实不想关联客户档案，可以取消勾选 `是否保存客户信息`，只保存订单快照。

保留快照的原因：

- 客户改名或换手机号后，历史订单仍能看到下单时填写的信息。
- 财务对账可以按 `customer_id` 稳定聚合，不依赖文本字段。

### 4.3 旧数据迁移

旧销售订单没有 `customer_id`，第一版先不做历史订单迁移，也不批量补齐 `customer_id`。

客户详情里的订单列表仅展示已经手动关联 `customer_id` 的订单。历史订单如需归入某个客户，可以后续通过订单编辑手动关联。

后续如果需要处理历史数据，再单独设计迁移或“合并客户/归档订单”功能。

## 5. 财务账款页改造

### 5.1 数据返回结构

`GET /api/accounts` 建议返回四组数据：

```typescript
interface AccountsOverview {
    supplier_accounts: SupplierAccountSummary[];
    customer_accounts: CustomerAccountSummary[];
    payables: PayableDetail[];
    receivables: ReceivableDetail[];
    summary: AccountsSummary;
}
```

其中：

```typescript
interface SupplierAccountSummary {
    supplier_id: number;
    supplier_name: string;
    contact_name?: string | null;
    phone?: string | null;
    order_count: number;
    line_count: number;
    payable_amount: number;
    paid_amount: number;
    refunded_amount: number;
    pending_payment: number;
    pending_refund: number;
    latest_ordered_at?: string;
    orders: PayableDetail[];
}

interface CustomerAccountSummary {
    customer_id?: number | null;
    customer_name: string;
    customer_phone?: string | null;
    order_count: number;
    line_count: number;
    receivable_amount: number;
    latest_order_at?: string;
    orders: ReceivableDetail[];
}
```

`payables` 和 `receivables` 继续保留当前分笔结构，用于分笔明细视图。

### 5.2 汇总视图

#### 应付商家

主表字段：

- 商家
- 联系人/手机号
- 未结进货单数
- 应付金额
- 已付金额
- 已退款
- 待付款
- 待退款
- 最近下单时间
- 操作

操作：

- 查看明细
- 去进货单
- 去供应商

付款/退款操作建议仍在单据明细上执行。原因是当前付款记录表绑定的是 `purchase_order_id`，不是 `supplier_id`。如果要做商家级付款，需要新增“供应商余额/预付款分摊”模型，第一版不建议引入。

#### 应收客户

主表字段：

- 客户
- 手机号
- 未收订单数
- 待收金额
- 最近下单时间
- 操作

操作：

- 查看明细
- 去客户信息
- 去分笔明细逐单处理

第一版不做“标记全部已收”。收款仍在展开明细或分笔明细中逐单处理，避免误操作。

### 5.3 分笔明细视图

保留当前表格能力：

- 进货单维度：登记付款、登记退款。
- 销售订单维度：标记已收、去结算。

建议调整命名：

- `待付` 改为 `进货应付/退款`
- `待收` 改为 `销售待收`

这样用户知道这里是分笔处理，不是聚合对账。

### 5.4 聚合与分笔之间的联动

支持从汇总视图跳转到分笔视图：

- 点击商家行的“查看明细”，切换到分笔明细并筛选 `supplier_id`。
- 点击客户行的“查看明细”，切换到分笔明细并筛选 `customer_id` 或客户分组键。
- URL 可带 query，方便从供应商页、客户页跳转：

```text
/admin/dashboard/finance/accounts?view=summary&type=supplier&supplier_id=1
/admin/dashboard/finance/accounts?view=detail&type=customer&customer_id=3
```

## 6. 供应商页的处理

供应商页不承载完整账款管理，只补充摘要和入口：

- 待付款
- 待退款
- 未结进货单数
- 查看账款

点击“查看账款”跳到财务账款页，并自动筛选当前供应商。

不建议在供应商页直接登记付款/退款。原因：

- 付款/退款本质属于财务动作。
- 当前付款/退款流水绑定进货单。
- 如果在供应商页直接付款，用户会自然期待“按商家一笔付款自动抵扣多张单”，这需要额外的分摊规则。

## 7. 接口建议

### 7.1 客户接口

新增：

```text
GET    /api/customers
POST   /api/customers
PUT    /api/customers/:id
DELETE /api/customers/:id
GET    /api/customers/:id/orders
```

删除规则：

- 已有关联销售订单的客户不允许删除。
- 后续如需要，可增加停用状态代替删除。

客户接口不承担隐式自动创建职责。创建客户只能由客户信息页面、明确的后台新增操作，或保存订单时勾选 `是否保存客户信息` 触发。
创建或更新客户时，手机号必填且不能与其他客户重复。

### 7.2 账款接口

沿用：

```text
GET /api/accounts
```

增强返回结构，不一定新增接口。

可选新增：

```text
GET /api/accounts/suppliers/:id
GET /api/accounts/customers/:id
```

第一版不需要单独接口，除非主接口数据量明显变大。

## 8. 分阶段落地

### 阶段一：先补客户主数据

- 新增 `customers` 表。
- `sales_orders` 增加 `customer_id`。
- 新增销售管理下的客户信息页面。
- 保存订单时支持选择 `已有客户` / `新客户`。
- 新客户可勾选 `是否保存客户信息`，显式创建客户档案并关联订单。
- 保存客户档案时手机号必填，并强拦截重复手机号。
- 后台订单编辑或结算时支持手动选择客户并写入 `customer_id`。
- 客户详情展示已关联订单和待收金额。
- 支持从客户页跳转到账款页并筛选当前客户。
- 不做手机号自动匹配和隐式自动创建。
- 不做旧订单历史迁移。

### 阶段二：账款页双视图

- `/api/accounts` 增加 `supplier_accounts` 和 `customer_accounts`。
- 账款页增加 `汇总视图` / `分笔明细`。
- 保留现有分笔表格和操作。
- 汇总行支持展开查看分笔单据。
- 支持 query 参数筛选对象。

### 阶段三：供应商与客户页入口

- 供应商页增加账款摘要和跳转。
- 客户页增加待收摘要和跳转。
- 客户详情中展示已关联订单和未收订单。

### 阶段四：可选增强

- 客户合并。
- 商家级付款并自动分摊到多张进货单。
- 对账单导出。
- 账期、信用额度、逾期提醒。

## 9. 第一版不做

- 不做供应商余额或预付款账户。
- 不做一笔付款自动分摊多张进货单。
- 不做复杂客户合并流程。
- 不做收款流水表，销售侧仍先使用 `sales_orders.is_paid` 表达是否已收。
- 不做银行流水、支付渠道自动对账。
- 不做手机号自动匹配和隐式客户自动创建。
- 不做历史订单迁移。
- 不做聚合视图批量付款或批量收款。

这些能力都可以做，但会明显增加财务模型复杂度。第一版先把“看得清、找得到、能追单据”做好。

## 10. 推荐落地顺序

推荐先做阶段一和阶段二。

原因：

- 有客户主数据后，应收聚合才稳定。
- 财务页双视图能马上解决“按对象看账”和“按单据处理”的冲突。
- 供应商页和客户页的摘要入口可以在主账款模型稳定后很快补上。

最终体验：

```text
财务看总账：进入账款管理，默认先看商家/客户聚合。
财务处理单据：从聚合行展开，或切到分笔明细逐单付款/收款。
销售看客户：进入客户信息，查看已关联订单和待收金额。
仓库看供应商：进入进货商家，查看供应商基本资料和账款入口。
```
