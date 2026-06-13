# 进货、入库与采购退货技术改动方案

## 背景与范围

本文基于 `plans/discussions/purchase-inbound-consolidation-discussion.md` 和当前实现梳理后续技术改动方案。

本次只输出方案，不直接改业务代码。阅读范围包括：

- `app/admin/dashboard/warehouse/purchase-orders/page.tsx`
- `app/admin/dashboard/warehouse/inbound/page.tsx`
- `app/api/purchase-orders/**`
- `app/api/inbound-orders/**`
- `lib/db/purchaseOrders.ts`
- `lib/db/purchaseReturns.ts`
- `lib/db/schema.sql`
- `lib/db/migrations.js`
- `const/types.ts`
- `app/admin/dashboard/services.ts`
- 与账款、库存件、数据导入导出相关的现有实现

## 当前实现现状

### 进货单

当前页面：`app/admin/dashboard/warehouse/purchase-orders/page.tsx`。

菜单名称为 `进货订单`，页面标题为 `进货单`。页面目前是单 Tab 列表，没有独立的退货 Tab。

当前进货单货物状态使用 `purchase_orders.status`：

| 状态值 | 页面文案 | 当前含义 |
| --- | --- | --- |
| `draft` | 草稿 | 可作为未确认下单状态，但新增进货单默认不是它 |
| `ordered` | 已下单 | 新增进货单默认状态 |
| `partial_inbound` | 部分入库 | 已产生部分入库 |
| `completed` | 已完成 | 采购数量全部入库 |
| `cancelled` | 已取消 | 已取消 |

当前资金状态由 `lib/db/purchaseOrders.ts#getPurchaseOrderSummaryCents` 推导：

```text
商品金额 = SUM(ordered_quantity * purchase_price_cents)
退货扣减 = SUM(已完成 purchase_returns 明细金额)
应付金额 = 商品金额 + shipping_fee + misc_fee - 退货扣减
已付金额 = active purchase_payments 合计
已退款 = active purchase_refunds 合计
净付款 = 已付金额 - 已退款
待付款 = MAX(应付金额 - 净付款, 0)
待退款 = MAX(净付款 - 应付金额, 0)
资金状态 = unpaid / partial_paid / settled / refund_due
```

这表示当前进货单资金状态已经把采购退货和退款混入进货单本身。

当前列表列：

- 进货单
- 商家
- 状态
- 商品汇总
- 资金汇总
- 下单时间
- 操作

当前搜索表单：

- 关键词搜索：单号、商家、商品名称、条形码
- 状态筛选：全部、草稿、已下单、部分入库、已完成、已取消
- 没有资金状态筛选
- 没有默认待办筛选

当前操作列：

- `编辑`：所有状态都展示，取消单进入接口后会被拒绝
- `入库`：有未入库数量且未取消时展示，直接打开当前页内的入库 Modal
- `付款`：有待付款且未取消时展示
- `退款`：有待退款且未取消时展示
- `取消`：未取消、无入库、净付款为 0 时展示

当前进货单详情展开区展示：

- 商品明细
- 付款记录
- 退货记录
- 退款记录

但没有展示关联入库记录列表。

当前新增和编辑：

- 新增进货单默认 `status = ordered`
- 表单状态允许选择 `draft` 或 `ordered`
- 已完成进货单只读明细，仍可编辑运费、杂费、备注等
- 已入库明细不能修改商品和采购价，采购数量不能小于已入库数量
- 新增时可同步创建初始付款记录

### 入库单

当前页面：`app/admin/dashboard/warehouse/inbound/page.tsx`。

菜单名称为 `入库单`，页面目前是全局入库记录列表加新增入库 Modal。

当前入库来源：

| 来源值 | 页面文案 | 当前行为 |
| --- | --- | --- |
| `purchase_order` | 从进货单导入 | 前端调用 `receivePurchaseOrder`，后端创建真实入库和库存件 |
| `opening_stock` | 历史库存 | 前端调用 `saveInboundOrder`，后端直接创建历史库存入库和库存件 |

当前 `inbound_orders.status` 固定写入 `completed`，页面没有展示入库单状态列。

当前列表列：

- 入库单
- 来源
- 商家
- 明细
- 入库成本
- 入库时间
- 操作

当前列表没有搜索表单，也不支持 URL 参数筛选或自动打开新增入库 Modal。

当前操作列：

- `详情`：只允许编辑入库单备注，明细、数量、成本价、序列号只读
- `退货`：打开入库页本地退货 Modal

当前退货 Modal：

- 只填写退货原因
- 调用 `/api/inbound-orders/[id]/returns`
- 不支持选择具体库存件
- 默认退还该入库单下全部仍在库库存件
- 不维护退货运费、物流、货物状态、退款状态

当前入库提交：

- `purchase_order` 来源调用 `/api/purchase-orders/[id]/receive`
- 创建 `inbound_orders`
- 创建 `inbound_order_items`
- 为每个数量创建一条 `inventory_items`
- 增加 `purchase_order_items.received_quantity`
- 重算 `purchase_orders.status`
- 重算商品库存数量

### 采购退货与退款

当前退货数据层：`lib/db/purchaseReturns.ts`。

当前 `purchase_returns` 表：

- `purchase_order_id`
- `inbound_order_id`
- `type`
- `reason`
- `status`，目前只有 `completed`
- `created_at`
- `updated_at`

当前 `purchase_return_items` 表按具体库存件记录退货明细：

- `purchase_return_id`
- `purchase_order_item_id`
- `inbound_order_item_id`
- `inventory_item_id`
- `product_id`
- `purchase_price_cents`

当前退货事务：

1. 校验入库单存在并关联进货单。
2. 如果传入 `inventory_item_ids`，只退选中库存件；否则退该入库单下全部 `in_stock` 库存件。
3. 创建 `purchase_returns.status = completed`。
4. 创建 `purchase_return_items`。
5. 将选中 `inventory_items.status` 更新为 `returned`。
6. 重算 `products.stock_quantity`。

当前退款逻辑：

- `purchase_refunds` 挂在 `purchase_order_id` 上，`purchase_return_id` 可选
- 页面在进货单详情和账款页登记退款
- 新增退款前校验进货单 `pendingRefundCents`
- 作废退款只改 `purchase_refunds.status = voided`
- 退款会影响进货单资金状态

当前库存件状态：

| 状态值 | 当前含义 |
| --- | --- |
| `in_stock` | 在库，可销售，可采购退货 |
| `sold` | 已售，不能采购退货 |
| `returned` | 已采购退货，不再计入库存 |

采购退货不会减少 `purchase_order_items.received_quantity`，所以退货不会改变进货单入库进度。

### 当前接口与数据模型

进货单接口：

| 接口 | 当前职责 |
| --- | --- |
| `GET /api/purchase-orders` | 按 `search`、`status` 列出进货单 |
| `POST /api/purchase-orders` | 创建进货单，可创建初始付款 |
| `GET /api/purchase-orders/[id]` | 获取进货单详情 |
| `PUT /api/purchase-orders/[id]` | 编辑进货单 |
| `POST /api/purchase-orders/[id]/cancel` | 取消进货单 |
| `POST /api/purchase-orders/[id]/receive` | 从进货单创建入库单和库存件 |
| `GET/POST /api/purchase-orders/[id]/payments` | 查询/新增进货付款 |
| `POST /api/purchase-orders/[id]/payments/[paymentId]/void` | 作废进货付款 |
| `GET/POST /api/purchase-orders/[id]/refunds` | 查询/新增供应商退款 |
| `POST /api/purchase-orders/[id]/refunds/[refundId]/void` | 作废供应商退款 |

入库单接口：

| 接口 | 当前职责 |
| --- | --- |
| `GET /api/inbound-orders` | 全量列出入库单 |
| `POST /api/inbound-orders` | 仅支持历史库存入库 |
| `PUT /api/inbound-orders/[id]` | 更新入库单备注 |
| `GET /api/inbound-orders/[id]/returns` | 查询该入库单退货记录 |
| `POST /api/inbound-orders/[id]/returns` | 为该入库单创建采购退货 |
| `POST /api/inbound-orders/[id]/return` | 旧的单数退货路由，逻辑与 `returns` 重复 |

账款接口：

- `GET /api/accounts` 通过 `listPurchaseOrders` 聚合供应商待付款和待退款。
- `PUT /api/accounts/payable/[id]` 会对进货单创建一笔待付款金额的付款记录。
- 当前账款页也可对进货单创建退款记录。

数据导入导出：

- `lib/db/dataExchange.ts` 已包含 `purchase_orders`、`purchase_order_items`、`purchase_payments`、`inbound_orders`、`inbound_order_items`、`inventory_items`、`purchase_returns`、`purchase_return_items`、`purchase_refunds`。
- 后续新增字段必须同步更新导入导出列清单。

## 产品方案与当前实现对比

| 产品方案要求 | 当前实现 | 需要改动 | 影响范围 |
| --- | --- | --- | --- |
| `purchase-orders` 菜单改为 `进货/退货`，页面内分 `进货`、`退货` Tab | 菜单为 `进货订单`，页面单列表 | 增加 Tabs，默认进货 Tab，新增退货 Tab | 导航、采购页前端、URL 参数 |
| 进货单状态列改名为 `货物状态` | 列名为 `状态` | 更新列名和状态文案 | 采购页、类型、筛选 |
| 资金汇总列改名为 `资金状态`，展示未付款/部分付款/已结清 | 当前为 `资金汇总`，且有 `待退款 refund_due` | 拆清进货单资金口径，移除进货单退款状态 | DB summary、API、采购页、账款页 |
| `草稿` 应表达为 `预下单`，新增默认预下单 | 新增默认 `ordered`，`draft` 文案为草稿 | 默认值改为 `draft`，文案改 `预下单`，增加确认下单动作 | 新增表单、POST、操作列 |
| 第一阶段不做预付款 | 当前新增进货单可填写初始付款 | 移除新增进货单初始付款入口，付款只放在入库同步付款或已有入库成本后的付款操作 | 新增表单、POST、付款校验 |
| `completed/已完成` 不再保留，改为 `已入库` | DB 和类型仍使用 `completed` | 状态值迁移为 `inbound` 或兼容别名，页面文案改 `已入库` | DB migration、类型、状态机、筛选 |
| 进货页不直接执行入库，只跳转入库单页 | 当前进货页内置入库 Modal | 移除或下沉进货页入库 Modal，操作改 URL 跳转 | 采购页、入库页、服务层 |
| 进货详情展示入库记录 | 当前详情没有入库记录 | API 返回或按需请求关联入库记录 | 采购详情、入库 API |
| 入库单保留为真实入库流水和执行页 | 已保留 | 补 URL 驱动、筛选、状态和跳转 | 入库页、入库 API |
| 入库页支持 `purchaseOrderId`、`action=create` 自动筛选/打开 Modal | 当前不读取 URL 参数 | 使用 `useSearchParams` 驱动筛选和弹窗初始化 | 入库页前端 |
| 入库页增加入库记录状态：已入库/部分退货/已退货 | 当前只展示库存件状态，不展示入库记录状态 | 按库存件数量推导状态 | 入库 API serializer、页面列、筛选 |
| 入库页展示入库/已售/在库/已退/可退数量 | 当前列表只展示明细和成本 | 增加聚合字段 | 入库 API 查询、页面列 |
| 入库页退货操作跳转到退货 Tab | 当前本页直接提交退货 | 操作改跳转；新增退货 Modal 放进退货 Tab | 入库页、采购页退货 Tab |
| 新增退货默认选择退货，不默认整批退货 | 当前默认退全部可退库存件 | 新增可退明细接口和选择交互 | 退货 API、退货 Modal、库存校验 |
| 采购退货记录有货物状态：待寄回/已寄回/商家已收货/已取消 | 当前只有 `completed` | 扩展 `purchase_returns` 状态字段 | DB、API、退货 Tab |
| 采购退货记录资金状态：未退款/部分退款/已退款 | 当前退款挂进货单，退货记录不算资金状态 | 退款改按退货记录归属并推导资金状态 | `purchase_refunds`、API、账款页 |
| 退货运费、承担方、退货物流维护在退货记录 | 当前无字段 | 第一阶段直接扩展 `purchase_returns` 字段，后续物流模块落地后再评估迁移或兼容视图 | DB、API、退货 Modal/编辑 |
| 退货金额和退款不回写进货单资金状态 | 当前退货扣减应付，退款减少净付款 | 重写进货单 summary 和账款聚合 | `purchaseOrders.ts`、账款页、财务口径 |
| 入库时可修正实际运费并可选同步付款 | 当前入库 Modal 不含运费/付款字段 | 扩展 receive payload，入库事务更新进货单运费并创建付款 | 入库页、`/receive` 接口 |
| 退货 Tab 搜索：退货单、进货单、入库单、商家、货物状态、资金状态、创建时间 | 当前没有退货 Tab | 新增列表和筛选 API | 前端、`purchaseReturns` 查询 |
| 保留历史库存入库 | 当前支持 `opening_stock` | 保留，增加筛选和来源展示 | 入库页、接口 |
| 换货暂不做独立换货单 | 当前 `purchase_returns.type` 支持 `exchange` 但页面无换货入口 | 第一阶段隐藏或弱化换货，只保留数据兼容 | 退货 Modal、类型定义 |

## 技术改动方案

### 总体原则

1. 保留 `purchase_orders`、`inbound_orders`、`inventory_items` 的职责边界。
2. 进货单只表达采购下单、入库进度和采购付款。
3. 入库单只表达真实到货批次和库存件生成。
4. 采购退货必须落到具体入库单和库存件。
5. 采购退货过程和退款状态在采购退货记录中维护，不再影响进货单资金状态。
6. 状态尽量由金额或库存件推导，避免人工维护重复状态。

### 数据模型改动

#### `purchase_orders`

建议继续使用 `status` 字段表达货物状态，但调整语义：

| 新状态值 | 页面文案 | 迁移来源 |
| --- | --- | --- |
| `draft` | 预下单 | 原 `draft` |
| `ordered` | 已下单 | 原 `ordered` |
| `partial_inbound` | 部分入库 | 原 `partial_inbound` |
| `inbound` | 已入库 | 原 `completed` |
| `cancelled` | 已取消 | 原 `cancelled` |

迁移策略：

```sql
UPDATE purchase_orders
SET status = 'inbound', updated_at = CURRENT_TIMESTAMP
WHERE status = 'completed';
```

兼容策略：

- 类型层新增 `inbound`，移除或仅内部兼容 `completed`。
- API 短期接受查询参数 `status=completed` 并映射为 `inbound`，避免旧 URL 或旧导出数据短期报错。
- `recalculatePurchaseOrderStatus` 全部入库时写入 `inbound`。
- 页面不再展示 `已完成`。

进货单资金 summary 调整建议：

```text
已入库商品金额 = SUM(purchase_order_items.received_quantity * purchase_price_cents)
应付金额 = 已入库商品金额 + purchase_orders.shipping_fee_cents + purchase_orders.misc_fee_cents
已付金额 = active purchase_payments 合计
未结清金额 = MAX(应付金额 - 已付金额, 0)

payment_status:
unpaid       已付金额 = 0 且未结清金额 > 0
partial_paid 已付金额 > 0 且未结清金额 > 0
settled      未结清金额 = 0
```

产品口径补充：当前系统已有 `misc_fee_cents`，第一阶段保留杂费并计入进货单资金状态，页面可继续展示为杂费。

进货单 summary 中建议移除或降级以下字段：

- `return_amount`
- `refunded_amount`
- `net_paid`
- `pending_refund`
- `refund_due`

兼容做法是后端短期仍返回这些字段但不参与进货单资金状态，前端逐步不展示。

#### `purchase_returns`

现有表可扩展为过程单据，不需要新建主表。第一阶段退货物流字段直接落在 `purchase_returns`，不等待物流模块。

第一阶段新增字段：

```text
goods_status TEXT NOT NULL DEFAULT 'pending_shipment'
shipping_fee_cents INTEGER NOT NULL DEFAULT 0
shipping_fee_bearer TEXT NOT NULL DEFAULT 'self'
self_shipping_fee_cents INTEGER NOT NULL DEFAULT 0
merchant_shipping_fee_cents INTEGER NOT NULL DEFAULT 0
logistics_company TEXT
tracking_no TEXT
shipped_at TEXT
merchant_received_at TEXT
cancelled_at TEXT
cancel_reason TEXT
note TEXT
```

`goods_status` 取值：

| 状态值 | 页面文案 |
| --- | --- |
| `pending_shipment` | 待寄回 |
| `shipped` | 已寄回 |
| `merchant_received` | 商家已收货 |
| `cancelled` | 已取消 |

`shipping_fee_bearer` 取值：

| 状态值 | 页面文案 |
| --- | --- |
| `self` | 我方 |
| `merchant` | 商家 |
| `shared` | 平摊 |

保留旧 `status` 字段作为兼容字段：

- 第一阶段可不再用它驱动页面。
- 旧值 `completed` 迁移时设置 `goods_status = merchant_received`，避免历史退货重新进入待办。
- 新建退货记录可继续写 `status = completed` 兼容旧查询，后续再评估是否清理。

采购退货资金状态不手动存表，从金额推导：

```text
退货应收金额 = 退货商品金额 + merchant_shipping_fee_cents
已收退款 = active purchase_refunds.amount_cents by purchase_return_id
未收退款 = MAX(退货应收金额 - 已收退款, 0)

refund_status:
unrefunded       已收退款 = 0 且未收退款 > 0
partial_refunded 已收退款 > 0 且未收退款 > 0
refunded         未收退款 = 0
```

已确认口径：退货应收金额包含退货商品金额和商家承担运费；我方承担运费只做成本统计，不参与应收退款。平摊运费只把商家承担部分写入 `merchant_shipping_fee_cents` 并计入应收退款。

#### `purchase_refunds`

建议复用现有表，但调整业务归属：

- 新增退货退款时必须提供 `purchase_return_id`。
- `purchase_order_id` 保留为冗余关联字段，创建时从退货记录自动带出，便于历史查询和导出。
- `purchase_refunds` 不再参与进货单资金状态计算。
- `purchase_refunds` 参与采购退货记录资金状态计算。

兼容策略：

- 历史 `purchase_return_id IS NOT NULL` 的退款保留并转为退货退款。
- 历史 `purchase_return_id IS NULL` 的退款不自动归属，保留为历史数据或历史备注，不参与新退货资金状态。

#### `inbound_orders`

不建议继续使用 `inbound_orders.status` 表达人为状态。入库记录状态从库存件推导：

```text
inbound_quantity = COUNT(inventory_items)
sold_quantity = COUNT(status = 'sold')
in_stock_quantity = COUNT(status = 'in_stock')
returned_quantity = COUNT(status = 'returned')
returnable_quantity = in_stock_quantity

record_status:
inbound          returned_quantity = 0
partial_returned 0 < returned_quantity < inbound_quantity
returned         returned_quantity = inbound_quantity
```

如果一张入库单部分已售、剩余已退，`returned_quantity < inbound_quantity`，状态仍是 `partial_returned`，页面同时展示可退数量为 0。

#### `inventory_items`

暂不新增状态。采购退货创建成功时继续将被退库存件改为 `returned` 并重算商品库存。

需要补充的校验：

- 只有 `in_stock` 可退。
- 已售出库存不能采购退货。
- 序列号管理明细必须按具体库存件选择。
- 非序列号管理明细可按数量提交，由后端在事务内选择可退库存件。

#### `dataExchange` 和 schema/migration

需要同步更新：

- `lib/db/schema.sql`
- `lib/db/migrations.js`
- `lib/db/dataExchange.ts`
- `const/types.ts`
- 可能的 demo seed 脚本

导入旧数据时需要兼容 `completed` 状态，并在导入后做状态归一。

### API 改动

#### 进货单 API

`GET /api/purchase-orders`

建议参数：

```text
search
goods_status
payment_status
include_inbound_orders
```

兼容现有：

- `status` 暂时映射到 `goods_status`
- `status=completed` 映射到 `goods_status=inbound`

`POST /api/purchase-orders`

- 默认 `status = draft`。
- 创建时不再默认已下单。
- 第一阶段不支持新增进货单时登记初始付款或预付款。
- 付款入口保留在入库时同步付款，或进货单已有入库成本后的付款操作。
- 如果后续需要预付款，单独设计预付款状态和资金口径。

`POST /api/purchase-orders/[id]/confirm`

新增确认下单接口：

- 仅允许 `draft -> ordered`。
- 二次确认由前端 `Popconfirm` 或 Modal 实现。

`POST /api/purchase-orders/[id]/cancel`

规则调整：

- 产品方案建议只允许 `draft` 取消。
- 当前实现允许无入库、无付款的非取消状态取消。
- 第一阶段收紧为只允许 `draft` 取消；`ordered` 即使无入库无付款也不允许取消。
- 如果后续需要处理已下单但不采购的场景，另行设计“关闭订单”或“作废订单”，不和取消混用。

`PUT /api/purchase-orders/[id]`

编辑边界：

- `draft`、`ordered`：允许编辑商家、商品、采购数量、采购价、预估运费、杂费、备注。
- `partial_inbound`：第一阶段建议只允许备注、预估/实际运费、杂费、预计到货等辅助字段；已入库明细不改。
- `inbound`：只允许备注、实际运费、杂费等辅助字段。
- `cancelled`：只读。

`POST /api/purchase-orders/[id]/receive`

接口可保留，调用入口从进货页迁到入库页。

建议扩展 payload：

```ts
{
  inbound_at: string;
  note?: string | null;
  shipping_fee?: number;
  misc_fee?: number;
  payment?: {
    amount: number;
    payment_account?: string | null;
    paid_at?: string;
    note?: string | null;
  };
  items: Array<{
    purchase_order_item_id: number;
    quantity: number;
    serial_tracking_enabled?: boolean;
    serial_numbers?: string[];
    warranty_enabled?: boolean;
    warranty_until?: string | null;
    note?: string | null;
  }>;
}
```

事务内处理：

1. 校验可入库数量。
2. 如果传入运费/杂费，回写 `purchase_orders`。
3. 创建入库单、入库明细、库存件。
4. 更新 `received_quantity`。
5. 如 `payment.amount > 0`，创建付款记录。
6. 重算进货单货物状态。
7. 重算商品库存。

付款接口口径：

- 第一阶段不支持预付款，新增进货单不创建初始付款记录。
- 入库时同步付款允许在同一事务内创建付款记录。
- 进货单独立付款入口只允许在存在已入库商品金额后使用，避免未入库付款被误表达为超付或退款。

#### 入库单 API

`GET /api/inbound-orders`

建议支持筛选：

```text
purchase_order_id
inbound_order_id
supplier_id
search
record_status
source_type
inbound_at_start
inbound_at_end
```

返回值增加：

```ts
summary: {
  inbound_quantity: number;
  sold_quantity: number;
  in_stock_quantity: number;
  returned_quantity: number;
  returnable_quantity: number;
  goods_amount: number;
  record_status: 'inbound' | 'partial_returned' | 'returned';
}
```

`GET /api/inbound-orders/[id]`

建议新增，供 URL 打开详情、退货 Modal 回填。

`GET /api/inbound-orders/[id]/returnable-items`

建议新增，供新增退货 Modal 拉取可退库存件。

返回按商品/入库明细分组：

```ts
{
  inbound_order: InboundOrder;
  purchase_order: PurchaseOrder;
  supplier: Supplier;
  groups: Array<{
    product_id: number;
    product: Product;
    inbound_order_item_id: number;
    purchase_order_item_id: number;
    serial_tracking_enabled: boolean;
    purchase_price: number;
    inbound_quantity: number;
    sold_quantity: number;
    returned_quantity: number;
    returnable_quantity: number;
    inventory_items: Array<{
      id: number;
      serial_number?: string | null;
      status: 'in_stock';
    }>;
  }>;
}
```

`POST /api/inbound-orders/[id]/returns`

短期可保留为兼容入口，但建议内部调用新的 `createPurchaseReturn` 逻辑。

`POST /api/inbound-orders/[id]/return`

这是旧重复路由，建议前端不再使用，后续标记废弃。

#### 采购退货 API

建议新增顶层采购退货接口：

| 接口 | 职责 |
| --- | --- |
| `GET /api/purchase-returns` | 退货 Tab 列表，支持搜索筛选 |
| `POST /api/purchase-returns` | 创建采购退货记录并更新库存件 |
| `GET /api/purchase-returns/[id]` | 获取退货详情 |
| `PUT /api/purchase-returns/[id]` | 编辑原因、备注、运费、物流基础信息 |
| `POST /api/purchase-returns/[id]/ship` | 确认发货，写入物流、运费、`shipped_at` |
| `POST /api/purchase-returns/[id]/merchant-receive` | 确认商家收货 |
| `POST /api/purchase-returns/[id]/cancel` | 取消退货 |
| `GET /api/purchase-returns/[id]/refunds` | 查询退货退款记录 |
| `POST /api/purchase-returns/[id]/refunds` | 确认收款/登记退款 |
| `POST /api/purchase-returns/[id]/refunds/[refundId]/void` | 作废退货退款 |

`GET /api/purchase-returns` 筛选参数：

```text
search
purchase_order_id
inbound_order_id
supplier_id
goods_status
refund_status
created_at_start
created_at_end
```

`POST /api/purchase-returns` 建议 payload：

```ts
{
  inbound_order_id: number;
  reason: string;
  note?: string | null;
  items: Array<{
    inbound_order_item_id: number;
    product_id: number;
    quantity?: number;
    inventory_item_ids?: number[];
  }>;
  shipping_fee?: number;
  shipping_fee_bearer?: 'self' | 'merchant' | 'shared';
  self_shipping_fee?: number;
  merchant_shipping_fee?: number;
  logistics_company?: string | null;
  tracking_no?: string | null;
}
```

后端选择库存件规则：

- 如果传 `inventory_item_ids`，必须全部属于该入库单且状态为 `in_stock`。
- 如果只传 `quantity`，只能用于非序列号管理明细；后端按 `inventory_items.id ASC` 自动选择 `in_stock` 库存件。
- 创建退货记录和更新库存件必须在同一事务内完成；创建成功后立即把选中库存件改为 `returned`，让退货库存退出可售池。
- 新建退货记录默认 `goods_status = pending_shipment`。

取消退货规则：

- 仅 `pending_shipment` 且没有 active 收款/退款记录时允许取消。
- 取消时将该退货单下 `returned` 库存件恢复为 `in_stock`，并重算库存。
- 已寄回或商家已收货的退货不允许取消，只能通过后续补入库处理。

#### 账款 API

当前 `GET /api/accounts` 只从进货单 summary 聚合供应商应付/退款。

调整后拆成两类供应商资金任务：

- 采购应付：来自进货单 `pending_payment > 0`
- 退货应收退款：来自采购退货 `refund_status != refunded`

账款页如果继续展示供应商待退款，数据来源应改为采购退货记录，而不是进货单 `pending_refund`。

`PUT /api/accounts/payable/[id]` 仍只负责进货单一键付款。

如果账款页要支持一键确认退货收款，建议新增明确类型，例如：

```text
PUT /api/accounts/purchase-return-refund/[returnId]
```

或复用退货退款接口，不在账款接口里隐式处理。

### 前端页面改动

#### 导航

`app/admin/dashboard/layout.tsx`：

- `进货订单` 改为 `进货/退货`
- 路径继续使用 `/admin/dashboard/warehouse/purchase-orders`
- `入库单` 菜单保留

#### 进货/退货页 URL 参数设计

建议参数：

| 参数 | 值 | 含义 |
| --- | --- | --- |
| `tab` | `purchase` / `returns` | 当前 Tab，默认 `purchase` |
| `action` | `create` | 自动打开当前 Tab 的创建 Modal |
| `purchaseOrderId` | number | 进货单筛选或退货创建起点 |
| `inboundOrderId` | number | 入库单筛选或退货创建起点 |
| `returnId` | number | 高亮或打开退货详情 |

建议跳转：

```text
/admin/dashboard/warehouse/purchase-orders?tab=purchase
/admin/dashboard/warehouse/purchase-orders?tab=returns
/admin/dashboard/warehouse/purchase-orders?tab=returns&action=create&inboundOrderId=123
/admin/dashboard/warehouse/purchase-orders?tab=returns&inboundOrderId=123
/admin/dashboard/warehouse/purchase-orders?tab=returns&returnId=456
```

从入库单点击 `退货`：

```text
/admin/dashboard/warehouse/purchase-orders?tab=returns&action=create&inboundOrderId={inboundOrderId}
```

从入库单点击 `查看退货记录`：

```text
/admin/dashboard/warehouse/purchase-orders?tab=returns&inboundOrderId={inboundOrderId}
```

#### 进货 Tab

列表列调整：

- 进货单号
- 商家
- 货物状态
- 商品汇总
- 资金状态
- 下单时间
- 操作

搜索表单调整：

- 关键词
- 货物状态：全部、预下单、已下单、部分入库、已入库、已取消
- 资金状态：全部、未付款、部分付款、已结清
- 可增加待办快捷筛选：默认显示 `预下单/已下单/部分入库` 或 `未付款/部分付款`

操作列建议：

| 货物状态 | 操作 |
| --- | --- |
| 预下单 | 确认下单、编辑、取消 |
| 已下单 | 编辑、入库 |
| 部分入库 | 编辑、继续入库、查看入库记录 |
| 已入库 | 编辑、查看入库记录；未结清时显示付款 |
| 已取消 | 查看 |

`入库` 和 `继续入库` 不打开本页 Modal，改为：

```text
/admin/dashboard/warehouse/inbound?purchaseOrderId={purchaseOrderId}&action=create
```

`查看入库记录` 跳转：

```text
/admin/dashboard/warehouse/inbound?purchaseOrderId={purchaseOrderId}
```

详情层增加 `入库记录` 分块：

- `RK-{id}`
- 入库时间
- 入库数量
- 入库成本
- 入库记录状态
- 操作：查看，跳转到入库页对应筛选

#### 入库单页 URL 参数设计

建议参数：

| 参数 | 值 | 含义 |
| --- | --- | --- |
| `purchaseOrderId` | number | 按进货单筛选，并在新增时回填进货单 |
| `inboundOrderId` | number | 定位或打开指定入库单详情 |
| `action` | `create` | 自动打开新增入库 Modal |
| `sourceType` | `purchase_order` / `opening_stock` | 可选，打开新增入库时指定来源 |

建议跳转：

```text
/admin/dashboard/warehouse/inbound?purchaseOrderId=123&action=create
/admin/dashboard/warehouse/inbound?purchaseOrderId=123
/admin/dashboard/warehouse/inbound?inboundOrderId=456
```

页面行为：

- 有 `purchaseOrderId&action=create` 时，拉取进货单详情，自动打开新增入库 Modal。
- 新增入库 Modal 默认来源 `purchase_order`，进货单下拉回填并禁用或高亮。
- 有 `purchaseOrderId` 且无 `action=create` 时，列表自动筛选该进货单。
- 用户可以清空筛选回到全局入库记录。

列表列调整：

- 入库单号
- 关联进货单号
- 商家
- 入库来源
- 入库时间
- 商品汇总
- 入库数量
- 已售数量
- 在库数量
- 已退数量
- 可退数量
- 入库记录状态
- 操作

操作列：

| 入库记录状态 | 操作 |
| --- | --- |
| 已入库 | 详情、退货 |
| 部分退货 | 详情、退货、查看退货记录 |
| 已退货 | 详情、查看退货记录 |

如果 `returnable_quantity = 0`，即使状态是 `partial_returned`，也不展示 `退货`。

新增入库 Modal：

- 保留 `purchase_order` 和 `opening_stock` 两种来源。
- `purchase_order` 来源增加 `实际运费`、可选付款信息。
- 运费保存到进货单，不保存到入库单。
- 付款金额默认 0；大于 0 时入库事务中创建付款记录。

#### 退货 Tab

退货 Tab 顶部：

- 新增退货按钮
- 搜索表单：退货单号、进货单号、入库单号、商家、货物状态、资金状态、创建时间范围

列表列：

- 退货单号
- 关联进货单号
- 关联入库单号
- 商家
- 商品汇总
- 退货金额
- 退货运费
- 运费承担方
- 货物状态
- 资金状态
- 创建时间
- 操作

操作列：

| 条件 | 操作 |
| --- | --- |
| 货物状态 `待寄回` | 编辑、确认发货、取消 |
| 货物状态 `已寄回` | 编辑、确认商家收货 |
| 货物状态 `商家已收货` | 编辑 |
| 货物状态 `已取消` | 查看 |
| 货物状态非 `已取消` 且资金状态非 `已退款` | 额外显示确认收款 |

新增退货 Modal：

1. 先选择进货单号或入库单号。
2. 选择进货单号后，加载该进货单下有可退库存的入库单列表。
3. 选择入库单号后，回填进货单、商家、入库明细。
4. 按商品分组展示入库数量、已售数量、已退数量、可退数量。
5. 序列号管理明细必须勾选具体库存件。
6. 非序列号管理明细可输入退货数量。
7. 提供整批退货快捷按钮，但执行前二次确认。
8. 提交后创建退货记录，库存件立即变为 `returned`。
9. 提交成功后停留在退货 Tab，并高亮或打开新退货记录。

确认发货 Modal：

- 物流公司
- 物流单号
- 退货运费
- 运费承担方
- 如果平摊，填写我方承担金额和商家承担金额
- 发货时间，默认当前时间

确认商家收货：

- 二次确认
- 可填写商家收货时间和备注

确认收款 Modal：

- 本次收款金额，默认未收退款金额
- 收款账号
- 收款时间
- 备注
- 提交后创建 `purchase_refunds`，并重算该退货单资金状态

### 状态迁移策略

#### 进货单状态

迁移前：

```text
draft / ordered / partial_inbound / completed / cancelled
```

迁移后：

```text
draft / ordered / partial_inbound / inbound / cancelled
```

迁移步骤：

1. 新增迁移脚本，更新 `completed -> inbound`。
2. 更新 `purchaseOrderStatuses`、`isPurchaseOrderStatus`、`const/types.ts`。
3. 更新所有 `editingOrder?.status === 'completed'` 判断。
4. 更新 `recalculatePurchaseOrderStatus` 全部入库时写 `inbound`。
5. 列表筛选兼容旧值 `completed`。
6. 数据导入时兼容旧值并归一为 `inbound`。

#### 采购退货状态

迁移前：

```text
purchase_returns.status = completed
```

迁移后：

```text
goods_status = pending_shipment / shipped / merchant_received / cancelled
refund_status = computed
```

历史数据建议：

- 已有 `purchase_returns.status = completed` 迁移为 `goods_status = merchant_received`。
- 历史退货的资金状态按 active `purchase_refunds.purchase_return_id` 计算。
- 没有关联退货单的历史退款不自动归属，保留为历史数据或历史备注，不参与新退货资金状态。

#### 入库记录状态

不迁移数据。接口实时按 `inventory_items` 聚合推导。

### 实施分阶段建议

#### 第一阶段：顺主流程

1. 增加 DB 字段和状态迁移。
2. 重写进货单 summary，不再混入退货/退款。
3. 进货单状态 `completed -> inbound`。
4. 移除新增进货单的初始付款入口，第一阶段不做预付款。
5. 进货页改名 `进货/退货` 并引入 Tabs。
6. 进货 Tab 改列名、筛选、操作跳转。
7. 入库页支持 URL 参数、搜索表单、推导状态和数量列。
8. 新增顶层采购退货 API 和退货 Tab。
9. 新增退货 Modal 支持选择库存件/数量；非序列号数量退货按 `inventory_items.id ASC` 自动选择。
10. 退货记录支持确认发货、确认商家收货、确认收款。
11. 退货物流、退货运费和运费承担方第一阶段直接保存到 `purchase_returns`。

#### 第二阶段：补齐财务和导出

1. 账款页拆分采购应付和退货应收退款。
2. 数据导入导出同步新增字段。
3. Demo seed 更新新状态和退货过程字段。
4. 历史无归属退款保留为历史数据或历史备注，不自动归属到新退货资金状态。

#### 第三阶段：物流模块衔接

1. 物流管理模块落地后，再评估 `purchase_returns` 上物流字段迁移到物流记录，或保留冗余字段/兼容视图。
2. 运费统计可以先读取退货单字段；物流模块落地后再统一统计口径。

## 测试点

### 进货单

- 新增进货单默认 `预下单`。
- 新增进货单不展示初始付款字段，也不会创建初始付款记录。
- `预下单 -> 已下单` 确认下单成功。
- `预下单` 可取消；取消后只读。
- `已下单` 即使无入库无付款也不能走取消，只能等待后续“关闭订单/作废订单”能力。
- 已下单从进货 Tab 点击入库能正确跳转入库页并打开 Modal。
- 部分入库后状态为 `部分入库`。
- 全部入库后状态为 `已入库`，DB 值为 `inbound`。
- 历史 `completed` 数据迁移后页面展示 `已入库`。
- 进货单资金状态不受采购退货和退款影响。
- 进货单付款不能超过允许口径。

### 入库单

- `purchaseOrderId&action=create` 自动打开新增入库 Modal。
- 入库数量不能超过剩余未入库数量。
- 序列号数量校验仍正确。
- 入库时修正运费能回写进货单。
- 入库时填写付款金额能同步创建付款记录。
- 入库记录状态按库存件推导正确。
- 已售库存不计入可退数量。
- 可退数量为 0 时不展示退货操作。

### 采购退货

- 从入库页点击退货能跳到退货 Tab 并打开新增退货 Modal。
- 序列号管理商品必须选择具体库存件。
- 非序列号管理商品按数量退货时后端选择库存件正确。
- 只能退 `in_stock` 库存件。
- 创建退货后库存件变 `returned`，商品库存数量减少。
- 创建退货后进货单货物状态不变化。
- 创建退货后进货单资金状态不变化。
- 确认发货后货物状态变 `已寄回`。
- 确认商家收货后货物状态变 `商家已收货`。
- 确认收款后创建退款记录，退货资金状态从未退款到部分退款或已退款。
- 作废退款后退货资金状态回退。
- `待寄回` 且无 active 收款记录的退货可取消，取消后库存件恢复为 `in_stock`。

### 账款和导出

- 采购应付只来自进货单待付款。
- 退货应收退款只来自采购退货记录。
- 数据导出包含新增字段。
- 旧导入文件中的 `completed` 能兼容迁移。

### 回归

- 销售结算仍只能使用 `in_stock` 库存件。
- 已退货库存不能被销售。
- 商品库存数量和 `inventory_items.status = in_stock` 数量一致。
- 现有历史库存入库不受影响。

## 风险点

1. 资金口径变化较大：当前进货单会扣减退货金额并展示待退款；调整后财务页、采购页、历史数据展示都会变化。
2. 第一阶段不支持预付款；如果后续增加预付款，需要单独设计预付款状态和资金口径。
3. 历史无关联退货单的退款无法自动归属到新退货资金状态。
4. `completed -> inbound` 会触及多个硬编码判断，遗漏会导致筛选或编辑规则异常。
5. 当前存在 `/api/inbound-orders/[id]/return` 和 `/returns` 两套路由，重构时需要避免前端误用旧路由。
6. 退货创建即把库存件改为 `returned`，但货物状态仍可能是 `待寄回`；这是已确认口径，用于避免退货库存继续销售。
7. 取消退货已限定为 `待寄回` 且无 active 收款记录，但恢复库存时仍要校验库存件没有被其他流程引用。
8. 非序列号商品按数量自动选择库存件已固定为 `inventory_items.id ASC`，需要确保该顺序在成本和追溯展示上可解释。
9. 入库页和退货 Tab 同时支持 URL 参数自动弹窗，刷新、返回、清理参数要处理好，避免重复提交。
10. 数据导入导出字段变化需要兼容旧 Excel，否则整库恢复会失败。

## 产品口径已确认的实现结论

以下结论来自产品方案讨论，可以直接作为第一阶段实现口径。

1. 第一阶段不做预付款。
   新增进货单时不登记初始付款；付款入口放在入库时同步付款，或已有入库成本后的进货付款操作。后续如需预付款，单独设计预付款状态和资金口径。

2. 保留 `misc_fee_cents` 杂费，并计入进货单资金状态。
   进货单资金公式为：

   ```text
   应付金额 = 已入库商品金额 + 实际运费 + 杂费
   已付金额 = 有效付款记录合计
   未结清金额 = 应付金额 - 已付金额
   ```

3. 采购退货创建成功时立即把选中的库存件改为 `returned`。
   这样可以让退货库存立即退出可售池，避免发起退货后继续被销售。退货货物状态可以仍是 `待寄回`。

4. 退货取消只允许在 `待寄回` 且没有 active 收款记录时发生。
   取消后将该退货单下的 `returned` 库存件恢复为 `in_stock`，并重算库存。`已寄回` 或 `商家已收货` 后不允许取消。

5. 退货应收金额按 `退货商品金额 + 商家承担运费` 计算。
   我方承担运费只做成本统计，不参与应收退款。平摊运费只把商家承担部分计入应收退款。

6. 历史 `purchase_refunds.purchase_return_id IS NULL` 的退款不自动归属。
   保留为历史数据或历史备注，不参与新退货资金状态。后续如需要清账，再单独设计人工归属工具。

7. `ordered` 且无入库无付款的进货单第一阶段也不允许取消。
   取消只允许 `draft`，也就是页面文案 `预下单`。如果后续要处理已下单但不采购的场景，单独设计“关闭订单”或“作废订单”。

8. 非序列号商品按数量退货时，后端自动选择库存件使用 `inventory_items.id ASC`。
   这个规则简单、稳定、可解释；同一入库单内也基本等价于最早入库。

9. 第一阶段退货物流字段直接落在 `purchase_returns`。
   物流模块仍在 backlog，不阻塞本阶段。后续物流模块落地后，再考虑迁移为物流记录关联或保留兼容视图。

10. 退货 Tab 顶部 `新增退货` 允许从进货单号或入库单号开始。
    如果先选进货单号，需要再选择该进货单下可退的具体入库单；如果直接选入库单号，则自动反查进货单和商家。最终创建退货前必须落到具体入库单。

## 后续继续设计的问题

以下内容不阻塞本阶段主流程，可以在后续产品或技术设计中继续细化。

1. 预付款是否要作为独立能力加入进货单资金体系。
2. 历史无归属退款是否需要人工归属工具。
3. 物流模块落地后，`purchase_returns` 上的物流字段是迁移到物流记录，还是保留冗余字段。
4. 已下单但不再采购的场景是否需要“关闭订单”或“作废订单”。
5. 换货是否从 backlog 升级为独立换货单。
