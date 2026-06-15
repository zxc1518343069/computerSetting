# 统一订单来源与售后服务下单接入方案

## 1. 背景

当前系统中，订单应成为所有成交业务的统一承载对象。后续不只售后服务需要接入订单，DIY 整机、零售、售后服务这三个真实业务入口都应该进入同一套订单列表，并通过来源字段进行筛选、区分和展示。

售后服务模块当前已经覆盖前台价目表展示和后台服务项目维护，并且已有前台服务多选、数量调整、checkout 汇总 Modal、`POST /api/after-sales/checkout` 占位接口。该占位接口目前不写库、不生成真实订单。

本方案在原“售后服务下单与订单联动”基础上扩展为一般方案：统一订单来源体系，同时完善售后服务的真实下单接入。

## 2. 目标

- DIY 整机、零售、售后服务都进入统一订单体系。
- 后台订单列表可以按订单来源筛选和区分展示。
- DIY 整机和零售订单继续走商品订单明细和库存相关逻辑。
- 售后服务订单进入同一张订单主表，但使用独立的售后服务明细表。
- 售后服务前台下单从占位 checkout 升级为真实创建订单。
- 保持商品订单、服务订单、库存交付之间的边界清晰。

## 3. 范围边界

### 本期包含

- 新增或规范订单来源字段 `source_type`。
- 统一订单来源类型：DIY 整机、零售、售后服务、手动/其他。
- 后台订单列表展示来源标签。
- 后台订单列表支持按来源筛选。
- DIY 整机订单由服务端固定写入 `source_type = 'diy'`。
- 零售订单由服务端固定写入 `source_type = 'retail'`。
- 售后服务下单创建真实订单，由服务端固定写入 `source_type = 'after_sales'`。
- 新增售后服务订单明细存储。
- 售后服务订单详情展示服务项目快照。
- 售后服务订单适配现有订单表头、展开区域和操作列。
- 售后服务订单支持确认服务完成，不绑定库存、不扣减库存。
- 售后服务订单展示「调整」入口，进入独立服务调整 Modal，不复用装机配置调整弹窗。
- 历史订单兼容为 `manual` 或根据旧数据推断来源。

### 本期不包含

- 售后工单流转：接机、检测、维修中、待取机、完成。
- 售后预约排期。
- 配件费、维修成本、利润核算的完整模型。
- 售后服务与库存扣减联动。
- 租赁、二手等新业务闭环。
- 大规模重构订单模型或支付模型。

## 4. 总体设计

订单体系分为“统一订单主表”和“按业务拆分明细”。

- `sales_orders` 作为统一订单主表，承载客户、金额、状态、备注、创建时间、来源等公共字段。
- `sales_orders` 记录来源类型 `source_type`。
- 商品型订单继续沿用现有商品明细表，服务型订单使用独立售后明细表。
- 订单列表、账款管理、金额统计可以统一基于 `sales_orders`。
- 展开详情、库存交付、服务项目展示等业务细节根据 `source_type` 分支查询，并统一使用 `sales_orders.id` 作为 `order_id` 关联明细。

不要为了统一而把售后服务伪装成商品，也不要让商品订单和售后服务订单强行共用同一套明细字段。

## 5. 订单来源与关联设计

建议新增或规范 `sales_orders.source_type` 字段，作为订单来源的结构化分类。

```ts
export type SalesOrderSourceType =
    | 'diy'
    | 'retail'
    | 'after_sales'
    | 'manual';
```

展示文案：

| 值 | 文案 | 说明 |
| --- | --- | --- |
| `diy` | DIY整机 | 首页 DIY 整机报价、整机配置生成的订单 |
| `retail` | 零售 | 零售商品页或商品销售入口生成的订单 |
| `after_sales` | 售后服务 | 售后服务页生成的服务订单 |
| `manual` | 手动/其他 | 后台手动创建、历史订单或无法识别来源的订单 |

`rental`、`second_hand` 等来源可以作为后续预留，但第一期不建议在 UI 中暴露，避免业务范围被提前拉大。

现有 `sales_orders.source` 字段如果已经存在并存储字符串，可以选择保留用于兼容。新的筛选、展示和业务判断以 `source_type` 为准。

订单明细关联方式：

| `source_type` | 明细表 | 关联方式 |
| --- | --- | --- |
| `diy` | `sales_order_items` | `sales_orders.id = sales_order_items.order_id` |
| `retail` | `sales_order_items` | `sales_orders.id = sales_order_items.order_id` |
| `after_sales` | `sales_order_after_sales_items` | `sales_orders.id = sales_order_after_sales_items.order_id` |
| `manual` | 视订单类型而定 | 优先兼容现有 `sales_order_items.order_id` |

如果售后服务需要设备型号、故障描述等整单级信息，可以新增 `sales_order_after_sales_details`，同样使用 `order_id` 关联 `sales_orders.id`，不需要额外关联字段。

## 6. 数据模型方案

### 6.1 订单主表增加来源字段

推荐新增 `source_type`，而不是复用自由文本字段。

```sql
ALTER TABLE sales_orders
ADD COLUMN source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('diy', 'retail', 'after_sales', 'manual'));

CREATE INDEX IF NOT EXISTS idx_sales_orders_source_type
    ON sales_orders(source_type);
```

迁移策略：

- 历史订单默认 `manual`。
- 如果旧字段能明确判断来源，可以迁移为 `diy` 或 `retail`。
- 新创建订单必须写入明确的 `source_type`。
- 明细统一使用 `order_id` 关联 `sales_orders.id`。

### 6.2 状态字段约定

业务枚举状态统一使用字符串，不使用 `0 / 1 / 2` 这类数字编码。

适用字段包括：

- `source_type`：订单来源，例如 `diy`、`retail`、`after_sales`、`manual`。
- `payment_status`：收款状态，例如 `unpaid`、`paid`、`refund_pending`、`refunded`。
- `delivery_status`：履约状态，例如 `undelivered`、`delivered`、`cancelled`。
- `price_type`：售后服务价格类型，例如 `fixed`、`range`、`multi`、`custom`。

原因：

- 数据库记录可读，排查问题时不需要额外查数字映射。
- 字符串枚举不会因为枚举顺序调整导致历史数据语义变化。
- TypeScript 可以用字符串联合类型表达业务含义。
- 后续新增状态时更直观，例如新增 `refund_pending` 比新增数字 `2` 更清晰。

布尔字段继续使用 `0 / 1`，例如 `is_paid`、`is_active`、`save_customer` 等。

状态枚举字段应配合数据库 `CHECK` 约束，避免写入非法字符串。

### 6.3 商品订单明细继续复用现有结构

DIY 整机和零售本质上都是商品销售订单，继续使用现有商品订单明细表 `sales_order_items`。

现有订单详情查询方式：

```text
sales_orders.id -> sales_order_items.order_id
```

配置调整仍继续使用现有调整表：

```text
sales_orders.latest_adjustment_id -> sales_order_adjustments.id -> sales_order_adjustment_items.adjustment_id
```

规则：

- `source_type = 'diy'`：表示整机配置或报价方案生成。
- `source_type = 'retail'`：表示普通商品零售生成。
- 商品明细仍然绑定商品、价格、数量。
- 商品明细继续通过 `sales_order_items.order_id` 关联订单。
- 库存不足、确认交付、库存扣减等逻辑只作用于商品型订单。

### 6.4 售后服务订单新增独立详情表和明细表

售后服务不是库存商品，不建议塞进 `sales_order_items.product_id`。

售后服务建议新增一张服务明细表；如需要记录设备型号、故障描述等整单信息，可再新增一张售后详情表。

- `sales_order_after_sales_items`：售后服务项目明细表，通过 `order_id` 挂到订单主表。
- `sales_order_after_sales_details`：可选，售后服务订单详情表，通过 `order_id` 挂到订单主表。

表：`sales_order_after_sales_details`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER PK | 售后订单详情 ID |
| `order_id` | INTEGER FK UNIQUE | 关联 `sales_orders.id` |
| `device_model` | TEXT | 设备型号，可选 |
| `fault_description` | TEXT | 故障描述，可选 |
| `service_note` | TEXT | 服务备注 |
| `completed_note` | TEXT | 完成备注 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

表：`sales_order_after_sales_items`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER PK | 明细 ID |
| `order_id` | INTEGER FK | 关联 `sales_orders.id` |
| `service_id` | INTEGER FK | 售后服务 ID |
| `service_name` | TEXT | 下单时服务名称快照 |
| `service_category_name` | TEXT | 下单时分类名称快照 |
| `price_type` | TEXT | 价格类型快照 |
| `price_label` | TEXT | 价格展示快照 |
| `quantity` | INTEGER | 数量 |
| `sale_price_cents` | INTEGER | 实际单价，单位分 |
| `total_price_cents` | INTEGER | 明细合计，单位分 |
| `note` | TEXT | 明细备注 |
| `created_at` | TEXT | 创建时间 |

服务明细必须做快照，避免后续服务名称、分类、价格调整后影响历史订单展示。

创建售后订单时的推荐顺序：

1. 创建 `sales_orders`，服务端固定 `source_type = 'after_sales'`。
2. 如有设备型号、故障描述等整单信息，创建 `sales_order_after_sales_details`，写入 `order_id` 和售后备注信息。
3. 创建 `sales_order_after_sales_items`，写入 `order_id` 和服务项目快照。

### 6.5 明细表关联规则

商品明细表不新增额外详情表关联字段，继续使用现有 `order_id`。

售后明细新表同样使用 `order_id` 关联订单主表。

查询详情时：

- 商品型订单使用 `sales_orders.id` 查询 `sales_order_items.order_id`。
- 售后服务订单使用 `sales_orders.id` 查询 `sales_order_after_sales_items.order_id`；如需整单售后信息，再查询 `sales_order_after_sales_details.order_id`。

## 7. API 设计

### 7.1 统一订单列表接口

修改 `GET /api/orders`：

- 支持 `source_type` 查询参数。
- 返回订单时包含 `source_type` 和来源展示文案。
- 列表基础信息来自 `sales_orders`。
- 展开详情时根据 `source_type` 分支查询对应明细。
- 售后服务订单详情返回 `after_sales_detail` 和 `after_sales_items`。
- 商品型订单继续按 `sales_orders.id -> sales_order_items.order_id` 返回商品明细。

筛选示例：

```text
GET /api/orders?source_type=after_sales
GET /api/orders?source_type=diy
GET /api/orders?source_type=retail
```

### 7.2 商品订单创建接口

订单来源应由服务端根据业务下单接口固定写入，不建议由前端传入 `source_type`。`source_type` 是订单归属事实，不是用户输入。

推荐拆分为业务下单接口：

```text
POST /api/diy/orders
POST /api/retail/orders
POST /api/orders
```

接口职责：

- `POST /api/diy/orders`：负责 DIY 整机订单创建，服务端固定写入 `source_type = 'diy'`。
- `POST /api/retail/orders`：负责零售订单创建，服务端固定写入 `source_type = 'retail'`。
- `POST /api/orders`：保留为后台手动/其他商品订单创建，服务端固定写入 `source_type = 'manual'`。
- `POST /api/orders` 不负责售后服务订单创建。

实现上可以抽取内部公共方法，例如 `createSalesOrder()`，由不同业务接口传入服务端固定的来源类型。前端只调用对应业务接口，不直接传 `source_type`。

兼容策略：

- 现有 DIY 和零售如果暂时仍共用 `POST /api/orders`，可以短期保留旧 `source` 字段推断来源。
- 迁移完成后，前台 DIY 和零售应改为调用各自业务接口。
- 不建议长期让前端传 `source_type`，避免来源被误传或伪造。

商品订单仍然要求商品明细合法，继续走现有库存和交付相关约束。

### 7.3 售后服务订单创建接口

新增专用接口：

```text
POST /api/after-sales/orders
```

请求结构建议：

```ts
interface CreateAfterSalesOrderPayload {
    customer_id?: number | null;
    customer_name: string;
    customer_phone?: string | null;
    save_customer?: boolean;
    handler_user_id?: number;
    note?: string | null;
    device_model?: string | null;
    fault_description?: string | null;
    service_note?: string | null;
    final_amount?: number;
    services: Array<{
        service_id: number;
        quantity: number;
        sale_price?: number;
        note?: string | null;
    }>;
}
```

服务端规则：

- 登录后才能创建订单，沿用现有后台鉴权规则。
- 服务项必须存在且启用。
- 第一版建议只允许固定价服务直接下单。
- `final_amount` 不传时按服务明细合计自动计算。
- 创建 `sales_orders`，服务端固定写入 `source_type = 'after_sales'`。
- 如有设备型号、故障描述、服务备注等整单信息，创建 `sales_order_after_sales_details`，写入 `order_id`。
- 写入 `sales_order_after_sales_items` 服务快照，使用 `order_id` 关联订单。
- 原 `POST /api/after-sales/checkout` 占位接口可废弃或改为转调真实创建接口。

### 7.4 售后服务确认完成接口

现有 `POST /api/orders/[id]/settle` 是商品订单交付接口，会要求库存绑定、写入 `order_inventory_items`、扣减库存并计算商品成本。售后服务订单不能直接复用该接口。

建议新增专用接口：

```text
POST /api/after-sales/orders/[id]/complete
```

请求结构建议：

```ts
interface CompleteAfterSalesOrderPayload {
    completed_note?: string | null;
}
```

服务端规则：

- 订单必须存在。
- `source_type` 必须为 `after_sales`。
- 当前履约状态必须是未完成或未交付。
- 不要求商品明细。
- 不要求库存绑定。
- 不写入 `order_inventory_items`。
- 不扣减库存。
- 更新 `sales_orders.status = 'completed'`。
- 更新 `sales_orders.delivery_status = 'delivered'`。
- 写入 `delivered_at` 和 `sold_at`，用于沿用现有订单完成时间和财务统计口径。
- `cost_amount_cents` 第一版保持 0 或原值，`profit_amount_cents` 按当前成本口径重算；UI 仍需标识售后成本未核算。

如果希望按钮文案更贴近业务，前端可以展示为「确认完成」；如果为了和现有订单列保持一致，也可以展示为「确认交付」，但弹窗内容必须明确这是确认服务已完成，不涉及库存。

### 7.5 售后服务调整接口

售后服务订单需要有「调整」入口，但不能复用商品订单的 `config-adjustment` 接口。

第一期有两种落地方式：

- 轻量版：本期只展示「调整」按钮和服务调整 Modal 入口，标记为后续；点击时提示「调整服务项目即将支持」。
- 完整版：本期实现服务调整接口，允许修改服务项目、数量、实际成交价和最终成交金额。

如本期实现，建议新增专用接口：

```text
PUT /api/after-sales/orders/[id]/adjustment
```

请求结构建议：

```ts
interface AdjustAfterSalesOrderPayload {
    services: Array<{
        source_service_item_id?: number | null;
        service_id: number;
        quantity: number;
        sale_price?: number;
        note?: string | null;
    }>;
    final_amount: number;
    adjustment_note: string;
}
```

实现原则：

- 只能调整未完成、未取消的售后服务订单。
- 调整记录不要写入商品 `sales_order_adjustments` 和 `sales_order_adjustment_items`，避免和装机配置调整混用。
- 如需要保留历史，新增售后服务调整记录表，例如 `sales_order_after_sales_adjustments` 和 `sales_order_after_sales_adjustment_items`。
- 如果第一期不做历史表，也至少要更新服务明细快照和订单金额，并在备注或调整说明中留痕。

### 7.6 账款管理联动

账款管理继续以 `sales_orders` 为统一来源，不为售后服务单独建立一套账款表。

应收款查询规则：

- 未收款订单来自 `sales_orders`。
- 金额使用 `sales_orders.final_amount_cents`。
- 收款状态使用 `sales_orders.payment_status`。
- 取消过滤使用 `sales_orders.delivery_status != 'cancelled'`。
- 账款列表返回 `source_type`，用于展示来源 Tag 和明细摘要。

明细摘要按来源查询：

- `diy`、`retail`：通过 `sales_orders.id` 统计 `sales_order_items.order_id` 对应的商品明细。
- `after_sales`：通过 `sales_orders.id` 统计 `sales_order_after_sales_items.order_id` 对应的服务明细。
- `manual`：按历史兼容逻辑展示，无法识别明细时显示 `-`。

收款操作继续更新 `sales_orders.payment_status` 和 `is_paid`，不需要区分商品订单或售后服务订单。

## 8. 前后台 UI 设计

### 8.1 订单列表

后台订单列表新增：

- 搜索/筛选项：新增「订单来源」或「来源类别」。
- 来源筛选选项：全部、DIY整机、零售、售后服务、手动/其他。
- 表格来源列：新增「来源」列，用 `Tag` 展示订单来源。
- 详情区域根据来源展示不同明细。

来源筛选建议放在现有搜索框、订单范围、收款状态、交付状态同一行。查询参数使用 `source_type`，例如 `GET /api/orders?source_type=after_sales`。

来源列建议放在「订单号」之后、「客户」之前，便于先识别订单来自哪个业务入口。

Tag 展示建议：

| 来源 | 文案 | Tag 颜色 |
| --- | --- | --- |
| `diy` | DIY整机 | `blue` |
| `retail` | 零售 | `green` |
| `after_sales` | 售后服务 | `cyan` |
| `manual` | 手动/其他 | `default` |

颜色不用承载业务状态，只用于快速区分来源；收款、交付、库存仍使用各自状态标签。

现有订单表头整体可以复用，但需要按订单来源调整语义和可用操作。

| 区域 | DIY 整机 | 零售 | 售后服务 |
| --- | --- | --- | --- |
| 来源 | 展示「DIY整机」标签 | 展示「零售」标签 | 展示「售后服务」标签 |
| 库存状态 | 按商品库存展示 | 按商品库存展示 | 展示「不涉及库存」或 `-` |
| 成交金额 | 展示最终成交金额 | 展示最终成交金额 | 展示最终成交金额 |
| 收款状态 | 沿用现有状态 | 沿用现有状态 | 沿用现有状态 |
| 成本/利润 | 展示商品成本和利润 | 展示商品成本和利润 | 第一版成本展示「暂未核算」或 `-`，不要误导为已核算成本 0 |
| 交付状态 | 沿用未交付、已交付、已取消 | 沿用未交付、已交付、已取消 | 沿用未交付、已交付、已取消；语义为服务未完成、服务已完成、已取消 |
| 经手人 | 下单时必选并展示 | 下单时必选并展示 | 下单时必选并展示 |
| 展开区域 | 展示原始下单配置、当前实际装机配置 | 展示商品明细 | 展示原始下单服务明细 |
| 调整 | 显示「调整配置」，进入装机配置调整 Modal | 第一版可隐藏或后续进入商品调整 Modal | 显示「调整」，进入售后服务调整 Modal |
| 确认交付 | 可用，绑定库存并扣减 | 可用，绑定库存并扣减 | 可用，文案可为「确认完成」或「确认交付」，不绑定库存、不扣减库存 |
| 编辑 | 可编辑客户、金额、收款状态、备注 | 可编辑客户、金额、收款状态、备注 | 可编辑客户、金额、收款状态、备注 |
| 取消 | 可用 | 可用 | 可用 |

展示规则补充：

- DIY 整机和零售展示商品明细。
- 售后服务展示服务明细。
- 售后服务订单不展示库存不足，不进入商品库存校验。
- 售后服务订单可以确认完成，但不使用商品交付弹窗，不要求库存绑定，不扣减库存。
- 售后服务订单可以展示「调整」入口，但必须进入售后服务调整 Modal，不复用装机配置调整流程。
- 售后服务订单成本模型未建立前，列表不要简单展示成本 `¥0.00` 并计算成完整利润；可展示「暂未核算」或只展示服务收入。
- 历史订单默认展示为手动/其他。

### 8.2 订单展开区域

订单列表当前通过加号展开订单明细。统一订单来源后，展开区域需要根据 `source_type` 分支渲染。

商品型订单：

- `source_type = 'diy'`：展示「原始下单配置」。如存在配置调整或已交付，则继续展示「当前实际装机配置」或「实际交付配置」。
- `source_type = 'retail'`：展示「商品明细」，字段包括商品分类、商品名称、数量、成交单价。
- 商品型订单可以继续展示最近调整记录。

售后服务订单：

- 展示「原始下单服务」。
- 字段包括服务分类、服务名称、价格类型、价格文案、数量、成交单价、小计和服务备注。
- 第一版不展示「当前实际装机配置」。
- 如果本期实现售后服务调整，则展示「当前服务项目」和「最近服务调整」。
- 如果本期只预留调整入口，则仍只展示「原始下单服务」。
- 不复用装机配置调整结构。

### 8.3 操作列适配

操作列需要根据来源控制按钮，避免服务订单误触商品库存和装机配置逻辑。

商品型订单：

- 未交付时可以显示「编辑」「确认交付」「取消」。
- 「确认交付」进入现有商品交付弹窗，要求绑定库存，并扣减库存。
- DIY 整机可以显示「调整配置」。
- 零售第一版建议隐藏「调整配置」，后续如有需要单独设计「调整商品」。
- 已交付未收款时继续显示「确认收款」。
- 已取消待退款时继续显示「标记已退款」。

售后服务订单：

- 未完成或未交付状态下显示「编辑」「调整」「确认完成」「取消」。
- 「调整」进入售后服务调整 Modal；如果本期不实现调整提交，按钮和 Modal 可以先标记为后续能力。
- 「确认完成」也可以沿用按钮文案「确认交付」，但弹窗内容必须明确是服务已完成确认。
- 「确认完成」不绑定库存、不扣减库存，只更新订单履约状态和完成时间。
- 不显示「调整配置」这个文案，因为售后服务不是装机配置。
- 已收款、待退款、已退款等资金状态操作可以复用现有逻辑。
- 后续如需要更完整的服务履约闭环，再新增接机、检测、维修中、待取机、完成等售后工单流转。

### 8.4 成本与利润展示

DIY 整机和零售订单的成本来自库存绑定后的商品成本，现有展示可以保留。

售后服务订单第一版没有完整服务成本模型，包括人工成本、配件成本、维修成本和外包成本。因此：

- 数据库层可以暂时让 `cost_amount_cents = 0`，用于兼容统一订单主表。
- UI 层不建议直接展示「成本 ¥0.00」并把成交额全部显示成确定利润。
- 推荐展示为「成本 暂未核算」或「成本 -」。
- 利润可以暂不展示，或展示为「毛利」并明确只是未扣除服务成本前的收入差额。
- 财务统计如暂时按 0 成本计入，需要在统计口径中标识「售后服务成本未核算」。

### 8.5 售后服务下单 Modal

售后服务页保持“服务选择、数量调整、合计、下单”的用户路径。真实下单 Modal 需要补齐订单主表需要的信息。

字段建议：

- 客户姓名：必填。
- 手机号：可选；如果选择保存客户，则按客户规则校验。
- 选择已有客户：可选，第一版也可以先使用新客户输入。
- 经手人：必填，复用现有 active admin users。
- 设备型号：可选，写入售后详情表。
- 故障描述：可选，写入售后详情表。
- 服务备注：可选，写入售后详情表。
- 订单备注：可选，写入 `sales_orders.note`。
- 最终成交金额：默认等于固定价服务合计，可手动调整。

提交后：

- 调用 `POST /api/after-sales/orders`。
- 服务端固定写入 `sales_orders.source_type = 'after_sales'`。
- 如填写设备型号、故障描述或服务备注，创建售后详情记录并写入 `order_id`。
- 写入经手人到 `created_by_user_id` 和 `created_by_username`。
- 写入售后服务订单明细快照。
- 提示订单已创建，并可在订单列表按「售后服务」筛选查看。

### 8.6 DIY 整机入口

DIY 整机报价确认下单时调用 DIY 下单接口：

```text
POST /api/diy/orders
```

该接口在服务端固定写入 `source_type = 'diy'`。前端不传 `source_type`。

后续订单列表可以通过数据库中的来源字段识别该订单来自整机配置，而不是普通零售。

### 8.7 零售入口

零售商品下单时调用零售下单接口：

```text
POST /api/retail/orders
```

该接口在服务端固定写入 `source_type = 'retail'`。前端不传 `source_type`。

零售订单仍然使用商品明细和库存逻辑。

### 8.8 售后服务入口

售后服务页保持“服务选择、数量调整、合计、下单”的用户路径。提交时改为调用 `POST /api/after-sales/orders`，生成真实订单。

该接口在服务端固定写入 `source_type = 'after_sales'`。前端不传 `source_type`。

第一版建议：

- 固定价服务可以直接下单并计入合计。
- 区间价、多价格、自定义价格服务先展示为到店确认。
- 如果必须支持非固定价服务下单，则下单时要求输入实际成交价。

## 9. 实施顺序

1. 增加 `sales_orders.source_type`，完成历史数据兼容。
2. 扩展订单类型定义、序列化、来源展示文案和按来源查询明细逻辑。
3. 后台订单列表增加来源列和来源筛选。
4. 抽取内部商品订单创建方法，供 DIY、零售、手动订单接口复用。
5. 新增或拆分 `POST /api/diy/orders`，服务端固定写入 `source_type = 'diy'`，商品明细继续写入 `sales_order_items.order_id`。
6. 新增或拆分 `POST /api/retail/orders`，服务端固定写入 `source_type = 'retail'`，商品明细继续写入 `sales_order_items.order_id`。
7. 保留 `POST /api/orders` 作为后台手动/其他商品订单接口，服务端固定写入 `source_type = 'manual'`。
8. 新增售后服务订单详情表和明细表。
9. 新增 `POST /api/after-sales/orders`，替换占位 checkout 行为，服务端固定写入 `source_type = 'after_sales'`，售后明细使用 `order_id` 关联订单。
10. 新增售后服务确认完成接口，不绑定库存、不扣减库存。
11. 后台订单列表按来源适配库存状态、成本/利润展示、展开区域和操作列。
12. 售后服务订单详情展示服务明细快照。
13. 账款管理按来源展示 Tag 和明细摘要，收款仍更新 `sales_orders`。
14. 售后服务订单操作列展示「调整」和「确认完成」，分别进入服务调整 Modal 和服务完成确认弹窗。
15. 补充后端接口来源保护，避免售后订单进入商品交付、装机配置调整等接口。
16. 补充数据导出、备份恢复和历史订单来源迁移。
17. 补充事务、类型定义和订单序列化。
18. 视复杂度决定本期是否完整实现售后服务调整提交；如果不实现，需在 Modal 中明确标记为后续能力。
19. 验证三类来源订单的创建、查询、筛选、详情展示、账款联动、操作列和金额正确性。

## 10. 补充实现检查项

### 10.1 状态文案按来源展示

底层可以继续复用 `delivery_status = 'undelivered' | 'delivered' | 'cancelled'`。

前端展示时按 `source_type` 翻译：

| 来源 | `undelivered` | `delivered` | `cancelled` |
| --- | --- | --- | --- |
| `diy` / `retail` / `manual` | 未交付 | 已交付 | 已取消 |
| `after_sales` | 未完成 | 已完成 | 已取消 |

### 10.2 接口来源保护

即使前端隐藏按钮，后端接口也必须按来源保护，避免售后订单误进入商品流程。

- `/api/orders/[id]/settle`：只允许商品型订单，不允许 `source_type = 'after_sales'`。
- `/api/orders/[id]/config-adjustment`：只允许 DIY 整机订单，不允许售后服务订单。
- `/api/after-sales/orders/[id]/complete`：只允许 `source_type = 'after_sales'`。
- `/api/after-sales/orders/[id]/adjustment`：只允许 `source_type = 'after_sales'`。

### 10.3 账款明细统计

账款应收金额继续来自 `sales_orders.final_amount_cents`，但明细摘要需要按来源统计：

- `diy` / `retail`：统计 `sales_order_items`，展示为 `x 条 / x 件`。
- `after_sales`：统计 `sales_order_after_sales_items`，展示为 `x 项 / x 次`。
- `manual`：按历史兼容逻辑展示，无法识别明细时显示 `-`。

### 10.4 财务利润口径

售后服务第一版没有完整服务成本模型，不应把成交金额直接当作确定利润。

- 售后服务收入可以计入销售额。
- 售后服务成本展示为「暂未核算」或 `-`。
- 财务利润统计需要标识「售后服务成本未核算」。
- 如果财务汇总暂时按 0 成本计算售后毛利，需要在页面或统计口径中明确说明。

### 10.5 取消与退款文案

取消、待退款、标记已退款可以复用 `sales_orders` 的资金状态逻辑，但文案要避免商品语义。

- 商品订单可以使用「交付」「退货」等文案。
- 售后服务订单应使用「完成」「退款」等文案。
- 已完成售后订单是否允许取消，本期需要明确规则；推荐第一版先不允许直接取消已完成售后订单，后续再设计退款/售后撤销流程。

### 10.6 调整能力落地方式

售后订单操作列展示「调整」是合理的，但第一版需要明确能力边界：

- 如果本期完整实现：支持调整服务项、数量、成交价、最终金额，并记录调整说明。
- 如果本期不完整实现：按钮可展示但禁用，或进入 Modal 后明确提示「后续支持调整服务项目」。
- 不要出现空 Modal 或半成品提交入口。

### 10.7 数据导出与迁移

新增字段和表需要进入数据交换、导出、备份和恢复范围：

- `sales_orders.source_type`。
- `sales_order_after_sales_details`。
- `sales_order_after_sales_items`。

历史订单迁移规则建议：

| 旧 `source` | 新 `source_type` |
| --- | --- |
| `frontend_quote` | `diy` |
| `frontend_retail` | `retail` |
| `manual` / 空 | `manual` |

### 10.8 事务与序列化

创建订单必须使用事务，避免只写入订单头但明细创建失败。

售后服务创建事务至少包含：

1. 创建 `sales_orders`。
2. 可选创建 `sales_order_after_sales_details`。
3. 创建多条 `sales_order_after_sales_items`。

类型和序列化需要同步更新：

- `SalesOrder` 增加 `source_type`。
- 新增 `AfterSalesOrderItem` 和可选 `AfterSalesOrderDetail` 类型。
- `/api/orders` 返回售后订单时包含 `after_sales_items` 和可选 `after_sales_detail`。
- 前端订单列表按 `source_type` 渲染不同明细、状态文案和操作按钮。

## 11. 风险与决策

- 订单来源字段必须是订单通用能力，不应该只服务售后模块。
- 订单来源是服务端事实，不应作为前端自由传入字段。
- 新订单必须写入 `source_type`；明细表统一使用 `order_id` 关联订单主表。
- 售后服务不应作为虚拟商品塞入商品表，否则会污染库存和商品类目。
- 售后服务订单不应复用商品明细表，否则库存交付逻辑会持续出现特殊分支。
- DIY 整机和零售可以共用商品订单明细，但必须通过 `source_type` 区分来源。
- 售后服务订单可以有「调整」能力，但不要复用装机「调整配置」能力；应单独设计「调整服务」。
- 售后服务订单可以确认完成或确认交付，但不要进入库存满足、库存不足、库存绑定、库存扣减等商品交付判断。
- 后端接口必须做来源校验，不能只依赖前端隐藏按钮。
- 「确认交付」在 UI 上可以保留为统一按钮文案，但内部必须按来源分流：商品订单走库存交付，售后服务订单走服务完成。
- 售后服务成本未建模前，UI 不要把成本 0 展示成已核算结论。
- 账款管理不另建售后账款体系，应收款继续以 `sales_orders` 为准，明细摘要按 `source_type` 查询对应明细表。
- 第一版不要过早暴露租赁、二手等来源，避免产生未完成业务入口。
- 多价格售后服务需要明确实际成交价，否则订单金额会和用户预期不一致。

## 12. 验收标准

- DIY 整机下单后生成订单，来源为「DIY整机」。
- 零售下单后生成订单，来源为「零售」。
- 售后服务下单后生成订单，来源为「售后服务」。
- 新订单均写入 `source_type`；售后服务订单可通过 `sales_order_after_sales_items.order_id` 查询到服务明细。
- 后台订单列表可以按来源筛选。
- 后台订单列表新增「来源」列，并用不同颜色的 Tag 展示 DIY整机、零售、售后服务、手动/其他。
- 售后服务下单时必须选择经手人，订单列表能展示该经手人。
- 商品型订单仍然展示商品明细，并保留库存交付逻辑。
- 售后服务订单展示服务明细快照，不触发商品库存交付校验。
- 售后服务订单展开后展示「原始下单服务」，包含服务分类、服务名称、数量、价格和备注。
- 售后服务订单未完成时显示「调整」操作，进入售后服务调整 Modal，不进入装机配置调整 Modal。
- 售后服务订单未完成时显示「确认完成」或「确认交付」操作，确认后更新订单履约状态，不要求库存绑定、不扣减库存。
- 售后服务订单成本展示为「暂未核算」或 `-`，不误导为已完成成本核算。
- 未收款售后服务订单能进入账款管理应收列表，收款后更新 `sales_orders.payment_status`。
- 账款管理应收列表能按来源展示 Tag，并按来源显示商品明细或售后服务明细摘要。
- 历史订单默认展示为「手动/其他」或按可推断规则迁移来源。
- 售后服务占位 checkout 行为被真实订单创建替代。
- 售后服务订单不能调用商品库存交付接口完成交付。
- 商品配置调整接口不能调整售后服务订单。
- 售后服务创建订单时，订单头、详情和明细在同一个事务内写入。
- 数据导出、备份恢复包含 `source_type` 和售后服务明细表。

---

方案更新时间：2026-06-15
