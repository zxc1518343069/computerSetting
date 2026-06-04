# 销售订单调整装机配置方案

## 1. 背景

当前前台配置页保存订单后，会生成一张待结算销售订单。后台订单列表的现有流程是：

- 前台配置页保存客户下单配置。
- 订单进入 `pending` 待结算状态。
- 后台在订单列表中点击“结算”，为每个订单明细绑定具体库存件和序列号。
- 结算接口扣减库存，并按实际绑定库存成本计算订单成本和利润。

这个流程覆盖了“下单配置和实际装机配置一致”的场景，但装机业务里会经常出现实际换配置：

- 原商品缺货，改用同分类其他型号。
- 客户临时升级或降级配置。
- 同价替换。
- 装机师傅根据实际兼容性调整配件。
- 客户补差价或商家让利。

当前系统存在两个限制：

- 订单编辑只能改客户信息、成交金额、收款状态和备注，不能调整订单明细。
- 结算接口要求 `inventory_items.product_id` 必须等于 `sales_order_items.product_id`，因此无法绑定替换后的实际库存件。

## 2. 核心原则

这类场景不能简单理解为“结算时换一个序列号”，而应该定义为：

```text
客户下单配置 = 报价快照
实际装机配置 = 履约结果
```

两者需要分开记录。原因：

- 客户下单时的配置和报价需要保留，用于解释原始报价。
- 实际装机配置决定最终出库库存、序列号、成本和售后追溯。
- 价格变化需要有明确来源，不能只藏在备注里。
- 最终成交价不一定等于调整后报价，可能存在补差价、让利、抹零等情况。

## 3. 目标

- 在订单列表新增独立的“调整配置”操作。
- 调整配置只允许处理待结算订单。
- 保留原始下单配置，不直接覆盖原始报价快照。
- 支持调整实际装机配置，并重新计算调整后报价。
- 展示原始报价、调整后报价、配置差价、最终成交价、价格调整说明。
- 结算时按调整后的实际装机配置选择库存和序列号。
- 结算后仍按实际绑定库存成本计算成本和利润。

## 4. 不做什么

第一版先不做以下复杂能力：

- 不做已结算订单的改单和反结算。
- 不做销售退货、换货和售后维修流程。
- 不做多次改单的完整审批流。
- 不做客户确认单签字或附件上传。
- 不做复杂权限区分，仍沿用当前后台登录权限。

后续如果需要完整审计，可以再扩展改单历史表和操作日志。

## 5. 页面入口

订单列表操作列建议拆成三个同级操作：

```text
编辑 | 调整配置 | 结算
```

职责边界：

| 操作 | 主要职责 | 是否影响配置 | 是否扣库存 |
| :--- | :--- | :--- | :--- |
| 编辑 | 客户信息、手机号、收款状态、普通备注 | 否 | 否 |
| 调整配置 | 实际装机配置、调整后报价、最终成交价、调整原因 | 是 | 否 |
| 结算 | 绑定库存件、绑定序列号、扣库存、计算成本利润 | 否 | 是 |

不建议把“调整配置”和“结算”合并到同一个弹窗。改单是业务单据调整，结算是库存和财务动作，合并后容易出现“结算时顺手改配置、顺手改价”的情况，后续查账和售后追溯会变乱。

## 6. 弹窗设计

### 6.1 编辑订单弹窗

保持轻量，只处理基础信息：

```text
客户名称
手机号
是否已收款
备注
```

是否保留“最终成交金额”有两种选择：

- 推荐：从编辑弹窗移到“调整配置”弹窗里统一处理，避免金额入口分散。
- 兼容：第一版可以暂时保留，但后续最好收敛到“调整配置”里。

### 6.2 调整配置弹窗

弹窗标题：

```text
调整装机配置
```

布局建议：

```text
订单基础信息
  订单号 / 客户 / 当前状态

原始下单配置
  只读展示客户下单时的商品、数量、单价、小计

调整后装机配置
  可编辑商品、数量
  默认从原始下单配置复制一份
  商品选择建议限制在同分类内

价格变化
  原始报价
  调整后报价
  配置差价
  最终成交价
  价格调整说明

底部操作
  取消 / 保存调整
```

价格变化示例：

```text
原始报价：¥5,000
调整后报价：¥5,600
配置差价：+¥600
最终成交价：¥5,500
价格调整说明：客户升级显卡，补差 500 元
```

保存后，订单仍然保持待结算状态，但列表上展示“已调整配置”标记。

### 6.3 结算弹窗

结算弹窗只做库存绑定：

```text
CPU i5-14600KF × 1        选择库存 / 序列号
显卡 RTX 4070 SUPER × 1   选择库存 / 序列号
内存 32G DDR5 × 2         选择库存 / 序列号
```

如果订单有调整配置，则结算按调整后的实际装机配置加载库存。

结算弹窗可以只读展示：

```text
最终成交价
预计成本
预计利润
```

但不再允许修改报价和成交价。

## 7. 金额模型

建议订单金额拆成三层：

```text
原始报价 original_amount
  前台下单时的报价总额，不随改单变化。

调整后报价 adjusted_amount
  后台调整装机配置后，根据实际配置重新计算出来的报价。

最终成交价 final_amount
  客户最终实际支付或应收金额，可手动确认。
```

字段含义：

| 字段 | 含义 | 是否可变 |
| :--- | :--- | :--- |
| `original_amount_cents` | 原始下单报价 | 创建订单后不变 |
| `adjusted_amount_cents` | 调整后装机配置报价 | 保存在最新调整记录中 |
| `final_amount_cents` | 最终成交价 | 调整配置时确认，也可后续收敛为唯一金额入口 |
| `discount_amount_cents` | 原始报价与最终成交价差额 | 根据 `original - final` 计算 |
| `config_adjustment_cents` | 调整后报价与原始报价差额 | 可通过 `adjusted - original` 实时计算 |
| `cost_amount_cents` | 实际出库成本 | 结算后按绑定库存成本计算 |
| `profit_amount_cents` | 利润 | 结算前可按 `final - 0` 或空值展示，结算后按 `final - cost` 计算 |

第一版也可以不单独存 `config_adjustment_cents`，通过 `adjusted_amount_cents - original_amount_cents` 实时计算。

## 8. 数据模型方案

### 8.1 推荐方案：完整拆表

由于实际业务中可能发生多次改单，第一版直接采用完整拆表方案，不再使用 `sales_order_items.item_role`
这种轻量兼容方案。

核心模型：

```text
sales_order_items
  只保存客户原始下单配置，不保存实际装机配置。

sales_order_adjustments
  保存每一次改单动作、金额变化、操作人和调整说明。

sales_order_adjustment_items
  保存某一次改单后的完整实际装机配置。

sales_orders.latest_adjustment_id
  指向当前生效的最新一次改单记录。
```

这样可以同时满足两个目标：

- 当前结算按最新一次改单后的实际装机配置执行。
- 历史上每一次配置调整都可以回看和追溯。

### 8.2 订单主表补充字段

在 `sales_orders` 增加当前生效改单记录指针：

```sql
ALTER TABLE sales_orders ADD COLUMN latest_adjustment_id INTEGER;
```

说明：

- `latest_adjustment_id` 为空，表示订单从未调整配置，结算按 `sales_order_items` 原始明细执行。
- `latest_adjustment_id` 不为空，表示订单已调整配置，结算按该调整记录下的 `sales_order_adjustment_items` 执行。
- `final_amount_cents` 仍然保存在 `sales_orders` 上，表示当前订单最终成交价。
- `adjusted_amount_cents`、`adjustment_note`、调整时间等列表展示字段可以从最新调整记录联查得到，不强制冗余到 `sales_orders`。

### 8.3 调整记录表

新增 `sales_order_adjustments`：

```sql
CREATE TABLE sales_order_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    previous_adjustment_id INTEGER REFERENCES sales_order_adjustments(id),
    original_amount_cents INTEGER NOT NULL DEFAULT 0,
    previous_adjusted_amount_cents INTEGER NOT NULL DEFAULT 0,
    adjusted_amount_cents INTEGER NOT NULL DEFAULT 0,
    previous_final_amount_cents INTEGER NOT NULL DEFAULT 0,
    final_amount_cents INTEGER NOT NULL DEFAULT 0,
    adjustment_note TEXT NOT NULL,
    created_by_user_id INTEGER,
    created_by_username TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_order_adjustments_order_created
    ON sales_order_adjustments(order_id, created_at);
```

字段含义：

| 字段 | 含义 |
| :--- | :--- |
| `previous_adjustment_id` | 上一次改单记录，第一次改单时为空 |
| `original_amount_cents` | 原始下单报价快照 |
| `previous_adjusted_amount_cents` | 调整前的配置报价，第一次改单时等于原始报价 |
| `adjusted_amount_cents` | 本次调整后的配置报价 |
| `previous_final_amount_cents` | 调整前的最终成交价 |
| `final_amount_cents` | 本次调整后确认的最终成交价 |
| `adjustment_note` | 本次调整说明，必填 |

价格差异可以由字段实时计算：

```text
本次配置差价 = adjusted_amount_cents - previous_adjusted_amount_cents
相对原始差价 = adjusted_amount_cents - original_amount_cents
本次成交价变化 = final_amount_cents - previous_final_amount_cents
```

### 8.4 调整明细表

新增 `sales_order_adjustment_items`：

```sql
CREATE TABLE sales_order_adjustment_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_id INTEGER NOT NULL REFERENCES sales_order_adjustments(id) ON DELETE CASCADE,
    source_order_item_id INTEGER,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    sale_price_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_order_adjustment_items_adjustment
    ON sales_order_adjustment_items(adjustment_id);
```

字段含义：

| 字段 | 含义 |
| :--- | :--- |
| `adjustment_id` | 所属改单记录 |
| `source_order_item_id` | 对应的原始下单明细，新增项可为空 |
| `product_id` | 本次调整后的实际装机商品 |
| `product_name` | 商品名称快照 |
| `product_category` | 商品分类快照 |
| `quantity` | 实际装机数量 |
| `sale_price_cents` | 本次调整后的销售单价快照 |

某一次改单后的完整实际装机配置，由该 `adjustment_id` 下的全部 `sales_order_adjustment_items` 组成。

如果需要展示“从什么改成什么”：

- 第一次改单的调整前配置 = `sales_order_items` 原始下单明细。
- 第二次及以后改单的调整前配置 = `previous_adjustment_id` 对应的调整明细。
- 调整后配置 = 当前 `adjustment_id` 对应的调整明细。

### 8.5 库存绑定表调整

当前 `order_inventory_items.order_item_id` 强引用 `sales_order_items`，这只适合“按原始订单明细结算”。采用完整拆表后，结算可能按 `sales_order_adjustment_items` 执行，因此库存绑定表也需要支持指向调整明细。

推荐调整为：

```sql
CREATE TABLE order_inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    order_item_id INTEGER REFERENCES sales_order_items(id) ON DELETE CASCADE,
    adjustment_item_id INTEGER REFERENCES sales_order_adjustment_items(id) ON DELETE CASCADE,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    cost_price_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (order_item_id IS NOT NULL AND adjustment_item_id IS NULL)
        OR
        (order_item_id IS NULL AND adjustment_item_id IS NOT NULL)
    )
);
```

规则：

- 未改单订单结算时，写入 `order_item_id`。
- 已改单订单结算时，写入 `adjustment_item_id`。
- 同一条库存绑定只能关联一种明细来源，不能同时关联原始明细和调整明细。

说明：旧表已有 `order_item_id NOT NULL`，实际实施时需要通过重建表方式迁移 SQLite 表结构。

### 8.6 多次改单规则

- 只有 `pending` 待结算订单允许新增改单记录。
- 每次点击“保存调整”都新增一条 `sales_order_adjustments`，不覆盖旧记录。
- 每条调整记录都保存一份完整的调整后配置，而不是只保存差异项。
- 保存调整后更新 `sales_orders.latest_adjustment_id` 指向最新记录。
- 保存调整后同步更新 `sales_orders.final_amount_cents`、`discount_amount_cents` 和 `profit_amount_cents`。
- 已结算订单不允许继续新增改单记录。
- 如果未来需要已结算后换货，需要单独设计销售退换货流程，不复用改单流程。

### 8.7 结算取数规则

```text
if sales_orders.latest_adjustment_id is null:
    结算明细 = sales_order_items
    库存绑定写 order_inventory_items.order_item_id
else:
    结算明细 = sales_order_adjustment_items where adjustment_id = latest_adjustment_id
    库存绑定写 order_inventory_items.adjustment_item_id
```

库存商品匹配校验仍然必须严格保持：

```text
inventory_items.product_id = 当前结算明细.product_id
```

## 9. 接口设计

### 9.1 获取订单列表

`GET /api/orders`

返回订单时建议同时返回：

```typescript
items: OrderSettlementItem[];                  // 兼容字段，返回当前用于结算的明细
original_items: SalesOrderItem[];              // 原始下单配置
latest_adjustment: SalesOrderAdjustment | null;
latest_adjustment_items: SalesOrderAdjustmentItem[];
adjustment_history: SalesOrderAdjustment[];    // 可选，列表页可不返回，详情或弹窗再返回
```

为了降低前端改造量，`items` 可以先保持兼容逻辑：

```text
如果存在 latest_adjustment，items = latest_adjustment_items
否则 items = original_items
```

### 9.2 调整配置

新增接口：

```text
PUT /api/orders/:id/config-adjustment
```

请求体：

```typescript
{
  items: Array<{
    source_order_item_id?: number;
    product_id: number;
    product_name: string;
    product_category: string;
    quantity: number;
    sale_price: number;
  }>;
  adjusted_amount: number;
  final_amount: number;
  adjustment_note: string;
}
```

后端规则：

- 订单必须存在。
- 订单状态必须是 `pending`。
- `items` 不能为空。
- `adjustment_note` 必填。
- 商品必须存在。
- 商品分类建议和原明细保持一致；第一版允许同分类替换，不允许跨分类替换。
- `adjusted_amount` 应由后端根据商品和定价规则重新计算，不能完全信任前端。
- 更新 `final_amount_cents`、`discount_amount_cents`、`profit_amount_cents`。
- 新增一条 `sales_order_adjustments`，不覆盖旧改单记录。
- 写入该调整记录对应的 `sales_order_adjustment_items`。
- 更新 `sales_orders.latest_adjustment_id` 指向最新调整记录。

### 9.3 结算订单

现有接口：

```text
POST /api/orders/:id/settle
```

调整规则：

- 先查找订单可结算明细：
  - 如果 `latest_adjustment_id` 不为空，使用最新调整记录下的 `sales_order_adjustment_items`。
  - 如果 `latest_adjustment_id` 为空，使用 `sales_order_items` 原始下单明细。
- 库存匹配仍然保持严格校验：
  - `inventory_items.product_id` 必须等于当前结算明细的 `product_id`。
- 写入库存绑定时：
  - 原始明细结算写 `order_inventory_items.order_item_id`。
  - 调整明细结算写 `order_inventory_items.adjustment_item_id`。
- 结算成功后更新库存状态、订单成本、利润和订单状态。

这样可以继续保持库存和当前结算明细一致，同时保留原始下单配置和全部改单历史。

## 10. 前端改造点

### 10.1 订单列表

文件：

```text
app/admin/dashboard/sales/orders/page.tsx
```

建议调整：

- 操作列增加“调整配置”按钮。
- 仅 `pending` 状态可用。
- 如果订单存在 `latest_adjustment` 或 `latest_adjustment_id`，在订单号或状态附近展示 `已调整配置` 标签。
- 展开行中展示两块信息：
  - 原始下单配置
  - 当前实际装机配置，如果没有调整则显示“未调整，按原始配置装机”

### 10.2 调整配置弹窗

建议单独拆组件：

```text
app/admin/dashboard/sales/orders/components/ConfigAdjustmentModal.tsx
```

职责：

- 接收当前订单。
- 加载销售商品列表。
- 如果订单已有最新调整记录，默认使用最新调整明细生成可编辑配置。
- 如果订单没有调整记录，默认使用原始配置生成可编辑配置。
- 支持同分类商品替换。
- 实时计算调整后报价、相对上次配置差价、相对原始配置差价。
- 输入最终成交价和调整说明。
- 保存后刷新订单列表。

如果组件超过 200 行，再拆出：

```text
components/OriginalConfigView.tsx
components/ActualConfigEditor.tsx
components/PriceChangeSummary.tsx
```

### 10.3 结算弹窗

现有结算弹窗需要改为按“当前可结算明细”加载库存。

如果订单已经调整配置：

- 展示实际装机配置。
- 通过实际装机明细的 `product_id` 拉库存。

如果订单没有调整配置：

- 保持当前逻辑，按原始订单明细拉库存。

## 11. 状态和展示

第一版不一定要新增订单状态，可以仍然使用：

```text
pending
completed
cancelled
```

另通过字段判断是否已改单：

```text
latest_adjustment_id IS NOT NULL
```

列表标签建议：

```text
待结算
已调整配置
已收款 / 未收款
库存满足 / 库存不足
```

如果后续想把状态拆细，可以增加：

```text
pending_adjusted
```

但第一版不推荐增加订单状态复杂度。

## 12. 校验规则

### 12.1 调整配置校验

- 只有待结算订单可以调整配置。
- 调整配置至少有一条有效商品。
- 数量必须大于 0。
- 商品必须存在且未删除。
- 替换商品默认限制在同分类。
- 调整说明必填。
- 最终成交价不能小于 0。
- 如果调整后报价和原始报价不同，必须填写价格调整说明。

### 12.2 结算校验

- 只有待结算订单可以结算。
- 每个结算明细必须选择等于数量的库存件。
- 同一库存件不能重复绑定。
- 库存件必须是 `in_stock`。
- 库存件商品必须等于当前结算明细商品。
- 结算后将库存件状态改为 `sold`。

## 13. 实施步骤

### 阶段一：数据和接口

- 给 `sales_orders` 增加 `latest_adjustment_id`。
- 新增 `sales_order_adjustments`。
- 新增 `sales_order_adjustment_items`。
- 重建或迁移 `order_inventory_items`，支持 `adjustment_item_id`。
- 改造订单列表查询，返回原始明细、最新调整记录和当前实际装机明细。
- 新增 `PUT /api/orders/:id/config-adjustment`。
- 改造结算接口，优先使用最新调整记录下的实际装机明细。

### 阶段二：后台页面

- 订单列表增加“调整配置”操作。
- 新增调整配置弹窗。
- 展开详情展示原始配置和实际装机配置。
- 订单列表增加“已调整配置”标签。
- 结算弹窗按实际装机配置加载库存。

### 阶段三：体验优化

- 调整配置时按分类筛选商品。
- 价格变化区实时展示原始报价、调整后报价、配置差价、最终成交价。
- 库存不足时在调整配置弹窗内给出提示。
- 保存调整后提示“配置已调整，结算时将按实际装机配置出库”。

### 阶段四：审计展示增强

- 在调整配置弹窗或订单详情中增加“改单记录”时间线。
- 展示每次调整的操作人、时间、配置差价、成交价变化和调整说明。
- 支持查看某一次调整前后的配置对比。

## 14. 验收标准

- 待结算订单可以点击“调整配置”。
- 调整配置弹窗能展示原始配置。
- 调整配置弹窗能修改实际装机配置。
- 修改配置后能实时看到调整后报价和差价。
- 保存时必须填写调整说明。
- 保存后订单列表展示“已调整配置”。
- 展开订单能同时看到原始配置和实际装机配置。
- 结算时按实际装机配置选择库存和序列号。
- 结算接口仍然禁止绑定不匹配的库存商品。
- 结算后成本和利润按实际绑定库存计算。

## 15. 推荐第一版交互总结

最终推荐的第一版后台操作流：

```text
客户前台保存订单
  -> 后台订单列表出现待结算订单
  -> 如果实际装机不变，直接结算
  -> 如果实际装机变化，先点“调整配置”
  -> 在调整配置弹窗中确认实际配置、调整后报价、最终成交价和调整说明
  -> 保存后订单仍为待结算，但带“已调整配置”标记
  -> 点击结算，按实际装机配置绑定库存和序列号
  -> 完成结算，扣库存并计算成本利润
```

这个方案的关键是：改单和结算分开，报价和实际装机分开，最终成交价和调整后报价分开。
