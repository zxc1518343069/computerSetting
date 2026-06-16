# 进货单商家返款功能方案

## 背景

在 `app/admin/dashboard/warehouse/purchase-orders/` 的进货列表操作列新增 `商家返款`，用于登记商家后续给我方的返款。

当前已有采购退货和退货收款能力，但现有退货收款要求关联 `purchase_returns`，语义是“退货产生的应收退款”。本功能的两个场景不等同于采购退货：

- `返利`：例如卖出 5 台笔记本后，商家额外返利 500 元。
- `价格保护`：例如进货时某商品成本 1000 元，后续商家价保退 50 元，该商品实际成本应变成 950 元。

因此建议新增独立的“商家返款”业务记录，不直接复用采购退货记录，避免把退货、返利、价保三类业务混在一张状态流里。

## 当前实现关联点

阅读范围：

- `app/admin/dashboard/warehouse/purchase-orders/page.tsx`
- `app/api/purchase-orders/[id]/refunds/route.ts`
- `app/api/purchase-returns/**`
- `lib/db/purchaseOrders.ts`
- `lib/db/purchaseReturns.ts`
- `lib/db/inboundOrders.ts`
- `lib/db/schema.sql`
- `lib/db/migrations.js`
- `const/types.ts`
- `app/admin/dashboard/services.ts`
- `app/api/accounts/route.ts`

当前关键事实：

- 进货单资金汇总在 `lib/db/purchaseOrders.ts#getPurchaseOrderSummaryCents` 中计算。
- 当前进货单应付金额按 `received_quantity * purchase_price_cents + misc_fee_cents` 计算。
- `purchase_refunds` 当前主要作为采购退货收款表使用，接口层要求新增退款必须关联采购退货。
- 入库和库存成本落在 `inbound_order_items.purchase_price_cents` 与 `inventory_items.cost_price_cents`。
- 销售结算会把库存件成本快照写入 `order_inventory_items.cost_price_cents` 和订单利润字段。
- 因此价保如果发生在商品售出之后，只更新 `inventory_items.cost_price_cents` 不会自动改变历史销售利润，还必须同步更新 `order_inventory_items.cost_price_cents` 并重算关联 `sales_orders.cost_amount_cents`、`sales_orders.profit_amount_cents`。

## 建议一期业务口径

### 返利

返利只登记为商家返款，不改变单品库存成本。

原因：

- 返利常常和销售达量、活动政策、渠道补贴有关，不一定能准确分摊到某一个库存件。
- 如果返利发生在商品已售之后，强行回改销售订单利润会牵涉历史订单重算。

一期处理：

- 记录返利金额、返利依据、可选关联商品和数量。
- 进入供应商往来中的“待结算商家返款 / 已结算商家返款”。
- 进入经营统计时作为独立的“返利收入 / 商家返款收入”，不回写到某个销售订单利润。
- 不修改 `inventory_items.cost_price_cents`。
- 不修改已完成销售订单的 `cost_amount` 和 `profit_amount`。

### 价格保护

价格保护登记为商家返款，并下调这批进货的真实成本，不限制商品是否已经售出。

一期处理：

- 价保可覆盖 `in_stock` 和 `sold` 库存件，不再用售卖状态限制。
- 用户必须选择参与价保的具体库存件，序列号和非序列号商品都不自动挑选。
- 价保只支持输入“调整后单价”，不支持输入总价保金额或自动平均分摊。
- 创建价保后，更新被影响的 `inventory_items.cost_price_cents`。
- 若库存件已经售出，同步更新 `order_inventory_items.cost_price_cents`，并重算关联销售订单的 `cost_amount_cents` 与 `profit_amount_cents`。
- 保留原始进货单价，用价保调整记录表达“原始采购价”和“调整后成本”的差异。
- 进货单详情、入库详情、库存成本和销售利润展示都以价保调整后的真实成本为准。
- 已采购退货的库存件不参与价保，避免和采购退货退款重复。

暂不处理：

- 返利自动分摊到单品成本。

这版方案按“价保改变真实成本，所以历史利润需要跟着变”的口径执行。

### 返款结算方式

商家返款支持两种结算方式：

- `实际收款`：商家把钱打给我方，记录收款账号和收款时间。
- `抵扣应付`：商家不打钱，直接抵扣该商家的采购待付款。

抵扣应付需要影响供应商净账款和进货单待付款。建议一期限制抵扣金额不能超过当前进货单同商家的待付款余额；如果进货单已经付清，则只能走实际收款。

## 数据模型建议

新增商家返款主表：

```sql
CREATE TABLE purchase_merchant_refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    type TEXT NOT NULL CHECK (type IN ('rebate', 'price_protection')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'partial_settled', 'settled', 'voided')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    settled_amount_cents INTEGER NOT NULL DEFAULT 0,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    note TEXT,
    voided_at TEXT,
    void_reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

新增商家返款明细表：

```sql
CREATE TABLE purchase_merchant_refund_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_refund_id INTEGER NOT NULL REFERENCES purchase_merchant_refunds(id) ON DELETE CASCADE,
    purchase_order_item_id INTEGER REFERENCES purchase_order_items(id),
    inbound_order_item_id INTEGER REFERENCES inbound_order_items(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    original_unit_cost_cents INTEGER,
    adjusted_unit_cost_cents INTEGER,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

新增价保影响库存件表：

```sql
CREATE TABLE purchase_merchant_refund_inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_refund_item_id INTEGER NOT NULL REFERENCES purchase_merchant_refund_items(id) ON DELETE CASCADE,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    inventory_status_at_adjustment TEXT NOT NULL,
    order_inventory_item_id INTEGER REFERENCES order_inventory_items(id),
    sales_order_id INTEGER REFERENCES sales_orders(id),
    old_cost_price_cents INTEGER NOT NULL,
    new_cost_price_cents INTEGER NOT NULL,
    old_order_cost_price_cents INTEGER,
    new_order_cost_price_cents INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

新增商家返款结算表：

```sql
CREATE TABLE purchase_merchant_refund_settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_refund_id INTEGER NOT NULL REFERENCES purchase_merchant_refunds(id) ON DELETE CASCADE,
    settlement_type TEXT NOT NULL CHECK (settlement_type IN ('cash', 'payable_offset')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    account TEXT,
    settled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    voided_at TEXT,
    void_reason TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

索引建议：

- `idx_purchase_merchant_refunds_order_status`：`purchase_order_id, status`
- `idx_purchase_merchant_refunds_supplier_status`：`supplier_id, status`
- `idx_purchase_merchant_refunds_type_time`：`type, occurred_at`
- `idx_purchase_merchant_refund_settlements_refund_status`：`merchant_refund_id, status`
- `idx_purchase_merchant_refund_inventory_items_inventory`：`inventory_item_id`

## 后端接口建议

### 获取弹窗上下文

`GET /api/purchase-orders/[id]/merchant-refunds/context`

返回：

- 进货单基础信息。
- 商家信息。
- 可价保的进货明细。
- 每条明细下已入库、已售、在库、已退货数量。
- 可参与价保的具体库存件列表，排除已采购退货库存件。
- 已售库存件关联的销售单信息，用于提示价保会影响哪些订单利润。
- 已登记商家返款汇总。

### 创建商家返款

`POST /api/purchase-orders/[id]/merchant-refunds`

通用字段：

- `type`: `rebate` 或 `price_protection`
- `occurred_at`
- `reason`
- `note`
- `settlement`: 可选，创建时同时登记实际收款或抵扣应付

返利字段：

- `amount`: 必填，返利金额。
- `rebate_basis_quantity`: 可选，返利依据数量，例如卖出 5 台。
- `items`: 可选，只用于记录返利关联商品，不改成本。

价保字段：

- `items`: 必填。
- `purchase_order_item_id`
- `inbound_order_item_id`
- `original_unit_cost`
- `adjusted_unit_cost`
- `inventory_item_ids`: 必填，用户选择参与价保的具体库存件。

价保金额由后端按选中的库存件和调整后单价计算，不接收用户手填总价保金额。

后端事务：

1. 校验进货单存在且未取消。
2. 校验返利金额或价保计算金额大于 0。
3. 返利：创建主表和可选明细，不修改库存成本。
4. 价保：校验明细属于该进货单，目标库存件属于该进货批次，允许 `in_stock` 和 `sold`，拒绝 `returned`。
5. 写入主表、明细表、库存件影响表。
6. 更新目标 `inventory_items.cost_price_cents`。
7. 对已售库存件，更新对应 `order_inventory_items.cost_price_cents`。
8. 汇总受影响销售订单，重算每张订单的 `cost_amount_cents` 与 `profit_amount_cents`。
9. 如果创建时带结算信息，写入结算表并重算主表结算状态；抵扣应付需要同步影响进货单待付款口径。
10. 返回更新后的进货单详情或商家返款详情。

### 查询商家返款

`GET /api/purchase-orders/[id]/merchant-refunds`

用于进货单展开区展示返款记录。

### 登记返款结算

`POST /api/purchase-orders/[id]/merchant-refunds/[refundId]/settlements`

支持部分结算，`settlement_type` 可选 `cash` 或 `payable_offset`，重算状态：

- `pending`：已结算 0。
- `partial_settled`：已结算金额大于 0 且小于应收。
- `settled`：已结算金额大于等于应收。

### 作废返款结算

`POST /api/purchase-orders/[id]/merchant-refunds/[refundId]/settlements/[settlementId]/void`

只作废结算流水，重算返款单结算状态。作废 `payable_offset` 时，需要还原供应商待付款口径。

### 作废商家返款单

`POST /api/purchase-orders/[id]/merchant-refunds/[refundId]/void`

一期限制：

- 已有有效结算的返款单，先作废结算再作废返款单。
- 作废价保单时，按 `purchase_merchant_refund_inventory_items.old_cost_price_cents` 还原库存件成本。
- 若价保影响过已售库存件，同步还原 `order_inventory_items.cost_price_cents` 并重算关联销售订单利润。
- 如果同一库存件后续又做过新的有效价保，禁止直接作废较早价保单，避免把成本还原到错误版本。

## 前端改动建议

### 进货列表操作列

在 `purchaseColumns` 操作列新增：

- `商家返款`

建议展示条件：

- 进货单未取消。
- 已有入库数量 `summary.total_received_quantity > 0`。

### 商家返款 Modal

标题：`登记 JH-{id} 商家返款`

基础信息区：

- 商家
- 已入库商品金额
- 已付款
- 待付款
- 已登记商家返款

表单：

- 类型：`返利` / `价格保护`
- 返款金额：返利手填，价保自动计算。
- 发生时间
- 原因/政策说明
- 结算状态：`待结算` / `本次同时结算`
- 结算方式：`实际收款` / `抵扣应付`
- 实际收款时填写收款账号、收款时间、备注。
- 抵扣应付时展示可抵扣待付款余额，并限制本次抵扣金额。

返利模式：

- 返利依据数量，可选。
- 关联商品，可选。
- 文案上明确：返利不会改变商品成本。

价格保护模式：

- 明细选择表。
- 展示商品、进货单价、已入库数量、已售数量、在库数量、当前成本。
- 选择参与价保的具体库存件。
- 输入调整后单价。
- 自动计算：原成本、调整后成本、价保合计。
- 库存件列表中区分在库、已售、已退货；已退货置灰不可选。
- 如果选中的库存件已售，Modal 中提示会重算关联销售单利润。

### 进货单展开区

在 `PurchaseOrderDetails` 中新增 `商家返款记录`：

- 返款单号，例如 `FK-{id}`。
- 类型：返利 / 价格保护。
- 应收金额、已结算金额、待结算金额。
- 状态标签。
- 发生时间。
- 操作：登记结算、作废。

### 资金状态展示

进货单资金区建议新增字段：

- 商家返款：累计应收。
- 已结算返款。
- 待结算返款。
- 实际收款。
- 抵扣应付。
- 价保金额：只统计 `price_protection` 类型。

不要把返利直接混进采购退货退款字段，避免用户误以为发生了退货。

## 汇总和账款口径

### 进货单 summary

建议新增字段：

- `merchant_refund_amount`
- `merchant_refund_settled_amount`
- `merchant_refund_pending_amount`
- `merchant_refund_cash_amount`
- `merchant_refund_offset_amount`
- `rebate_amount`
- `price_protection_amount`
- `adjusted_goods_amount`

其中：

- `goods_amount` 保留原已入库商品原始采购金额。
- `price_protection_amount` 是价保下调的成本金额。
- `adjusted_goods_amount = goods_amount - price_protection_amount`。
- `merchant_refund_offset_amount` 用于抵扣应付，需减少进货单和供应商账款中的待付款余额。
- 已售商品的利润以价保后的成本重算；返利仍不自动分摊到利润。

### 供应商账款页

`app/api/accounts/route.ts` 中新增供应商应收返款：

- 采购应付：进货待付款。
- 采购退货应收：采购退货待收款。
- 商家返款应收：返利和价保待结算款。
- 商家返款抵扣：已用于抵扣采购应付的金额。

供应商聚合层新增：

- `merchant_refund_amount`
- `merchant_refund_settled_amount`
- `merchant_refund_pending_amount`
- `merchant_refund_cash_amount`
- `merchant_refund_offset_amount`
- `merchant_refunds`

这样在账款页能看到“这个商家我还欠多少钱 / 他还该返我多少钱”。

## 类型和服务改动

`const/types.ts` 新增：

- `PurchaseMerchantRefund`
- `PurchaseMerchantRefundItem`
- `PurchaseMerchantRefundSettlement`
- `PurchaseMerchantRefundType`
- `PurchaseMerchantRefundStatus`

`app/admin/dashboard/services.ts` 新增：

- `fetchPurchaseMerchantRefundContext(orderId)`
- `fetchPurchaseMerchantRefunds(orderId)`
- `createPurchaseMerchantRefund(orderId, data)`
- `createPurchaseMerchantRefundSettlement(orderId, refundId, data)`
- `voidPurchaseMerchantRefundSettlement(orderId, refundId, settlementId, void_reason)`
- `voidPurchaseMerchantRefund(orderId, refundId, void_reason)`

## 实施步骤

1. 数据库：更新 `lib/db/schema.sql` 和 `lib/db/migrations.js`，新增商家返款相关表和索引。
2. DB 层：新增 `lib/db/purchaseMerchantRefunds.ts`，封装序列化、列表、创建、结算、作废和状态重算。
3. 汇总：在 `lib/db/purchaseOrders.ts` 中把商家返款汇总挂到进货单详情。
4. API：新增 `/api/purchase-orders/[id]/merchant-refunds/**`。
5. 类型和请求：补齐 `const/types.ts` 与 `app/admin/dashboard/services.ts`。
6. 前端：在进货操作列增加 `商家返款`，新增 Modal、展开区记录和结算/作废操作。
7. 账款：在 `app/api/accounts/route.ts` 与账款前端中加入商家返款应收。
8. 验证：覆盖返利、价保、部分结算、作废结算、作废价保、库存成本变化、已售订单利润重算、抵扣应付和账款汇总。

## 验收标准

- 可以在进货单操作列点击 `商家返款` 打开 Modal。
- 选择 `返利` 登记 500 元后，进货单展开区展示返利记录，库存成本不变。
- 选择 `价格保护` 对 1000 元商品登记 50 元价保后，目标库存件成本变为 950 元。
- 如果目标库存件已售，关联销售订单成本降低 50 元，利润增加 50 元。
- 价保只支持输入调整后单价，不出现总价保金额输入。
- 用户需要自己选择参与价保的具体库存件，已退货库存件不可选。
- 价保返款单能登记实际收款或抵扣应付，状态从待结算变为已结算或部分结算。
- 供应商账款能看到商家返款待结算金额。
- 作废未结算返利不会影响库存。
- 作废价保会还原对应库存件成本；如影响已售库存件，也会还原销售绑定成本并重算利润。
- 已取消进货单不能新增商家返款。

## 已确认业务口径

- 返利作为独立收入统计，不回写销售订单利润。
- 价格保护只支持输入调整后单价。
- 商家返款支持实际收款和抵扣应付。
- 价保库存件由用户自己选择，系统不自动挑选。
- 已采购退货库存件不参与价保。
- 一期不做独立商家返款列表页，只在进货单详情和账款页展示与操作。
