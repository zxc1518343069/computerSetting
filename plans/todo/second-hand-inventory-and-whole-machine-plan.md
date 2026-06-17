# 二手库存与整机入库方案

## 状态

- 当前阶段：方案已定，等待开发
- 放置目录：`plans/todo/`
- 相关入口：`/admin/dashboard/warehouse/inbound`、商品中心、销售订单结算
- 核心原则：二手单件复用现有入库模型；二手整机作为一条可售库存件，配置明细只做结构化快照，不直接增加配件库存

## 背景

当前系统已经形成以下库存模型：

```text
products
  商品型号或商品基础档案

inbound_orders
  实际入库批次

inbound_order_items
  入库批次下的商品明细

inventory_items
  每一件真实库存，承接序列号、成本、质保、状态和销售扣减
```

现有入库来源主要是：

```text
purchase_order  来自进货单
opening_stock   历史库存/期初库存
```

接下来需要补齐二手业务。二手业务不能只靠 `source_type` 判断，因为商品中心和销售结算真正需要区分的是某一件库存本身是新品还是二手、单件还是整机、成色如何、检测情况如何。

因此本方案将二手能力拆成两个维度：

```text
入库来源 source_type
  这批库存从哪里来

库存属性 inventory_items
  这一件库存是新品还是二手、单件还是整机、成色和检测结果是什么
```

## 产品方案

### 目标

1. 支持显示器、CPU、显卡、硬盘等二手单件入库。
2. 支持二手整机入库，并录入整机内各配件配置。
3. 商品中心在库明细能清楚区分新品、二手、单件和整机。
4. 销售结算选择库存时能看到二手属性，避免误选库存。
5. 避免二手整机和内部配件重复计算库存。
6. 为后续“整机拆解成配件库存”保留数据结构和操作入口。

### 不纳入第一版范围

- 不做完整二手回收报价系统。
- 不做检测工单、图片附件、维修记录和售后记录。
- 不做二手整机自动估价。
- 不做复杂客户/个人卖家管理，第一版复用现有商家或来源方能力。
- 不在第一版实现整机拆解生成配件库存，但数据结构要为该能力预留。

### 二手单件入库

二手单件包括：

- 显示器
- CPU
- 主板
- 内存
- 显卡
- 硬盘
- 电源
- 机箱
- 散热
- 其他可以单独出售的配件

这类物品本质仍是一件普通可售库存，因此继续走现有入库单，只是在新增入库单 Modal 中增加 `二手回收` 来源。

用户路径：

```text
入库单 -> 新增入库单 -> 入库来源选择“二手回收” -> 入库类型选择“单件”
```

表单字段建议：

```text
回收来源
入库时间
商品
数量
单件回收成本
序列号
是否质保
质保到期
成色
检测备注
预期售价
备注
```

二手回收模式下：

- 物流公司不是必填。
- 不产生进货单应付款。
- `回收来源` 第一版可以复用 `suppliers`，UI 文案在二手模式下展示为“回收来源”。
- 如果来源是临时个人，可以先使用一个通用来源，例如“个人回收/散客回收”，详细姓名和联系方式放备注；后续再独立做回收来源管理。

### 二手整机入库

二手整机不是普通商品备注的变体，而是一个独立库存形态。

第一版建议采用：

```text
一台二手整机 = 一条可售 inventory_item + 多条结构化配置明细
```

也就是说，整机本身进入库存，整机内的 CPU、显卡、内存等配件只作为这台整机的配置快照，不作为单独库存件。

示例：

```text
库存件 #1001
商品类目：整机
库存名称：二手整机 i5-12400F / RTX 3060 / 16G / 1T
库存属性：二手 / 整机
成色：A
回收成本：2800
预期售价：3599
状态：在库
```

配置明细：

```text
CPU：i5-12400F
主板：B660M
内存：DDR4 16G
显卡：RTX 3060 12G
硬盘：1T NVMe
电源：650W
机箱：普通机箱
散热：风冷
显示器：无
备注：显卡轻微积灰，硬盘健康 98%
```

用户路径：

```text
入库单 -> 新增入库单 -> 入库来源选择“二手回收” -> 入库类型选择“整机”
```

整机表单字段建议：

```text
回收来源
入库时间
整机标题
整机商品
回收成本
预期售价
成色
序列号/机身编号
检测备注
整机备注
配置明细
```

配置明细字段建议：

```text
配件类别
关联商品（可选）
配件名称
规格描述
序列号（可选）
成色（可选）
备注
```

其中 `关联商品` 是可选项：

- 如果商品库里已有这个 CPU、显卡或硬盘，可以关联已有商品，方便后续搜索和拆机。
- 如果商品库里没有，可以只手填配件名称和规格，避免为了每台二手整机强制创建大量商品档案。

### 整机类目与商品档案

需要新增一个商品类目：

```text
整机
```

但不建议每收一台二手整机都创建一个新的 `products` 商品档案，否则商品中心会被大量一次性整机 SKU 污染。

第一版建议：

1. 新增 `整机` 类目。
2. 创建一个或少量通用整机商品，例如：

```text
二手整机
二手办公整机
二手游戏整机
```

3. 每台实际整机的唯一标题、配置、成色、成本和售价落在 `inventory_items` 及整机配置表中。

商品中心展示整机时，以库存件标题优先，例如：

```text
二手整机 i5-12400F / RTX 3060 / 16G / 1T
```

而不是只展示通用商品名“二手整机”。

### 商品中心在库明细

商品中心的在库明细需要增加以下展示：

```text
库存ID
库存名称
类型：新品 / 二手
形态：单件 / 整机
成色
序列号
商家/来源
成本
预期售价
入库时间
质保
备注
```

建议增加筛选：

```text
全部类型 / 新品 / 二手
全部形态 / 单件 / 整机
全部成色 / S / A / B / C / 故障件
```

如果库存是整机，明细行提供“查看配置”入口，展开或弹窗展示整机配置。

### 销售结算

销售订单结算选择库存时，库存下拉不能只展示：

```text
#库存ID / 序列号 / 成本
```

需要改成能辨认库存属性，例如：

```text
#1001 / 二手整机 i5-12400F + RTX 3060 / A / ¥2800
#1002 / 二手 / A / SN123 / ¥800
#1003 / 新品 / SN456 / ¥900
```

这样后台结算时不会把新品和二手混选。

### 整机拆解

第一版不实现拆解，但需要明确后续规则。

如果一台整机后续不整机出售，而是拆成配件卖，需要走“整机拆解”操作：

```text
整机库存 #1001 状态：已拆解

生成新的配件库存：
- CPU i5-12400F，成本分摊 600
- 显卡 RTX 3060，成本分摊 1200
- 内存 16G，成本分摊 200
- 硬盘 1T NVMe，成本分摊 300
```

规则：

- 整机拆解后，原整机不再可售。
- 拆出来的配件会生成新的 `inventory_items`。
- 拆机生成的配件库存来源应能追溯到原整机库存。
- 同一台整机不能同时作为整机库存和配件库存售卖。

## 技术方案

### 总体策略

在现有入库和库存模型上扩展，不重写采购、入库和销售流程。

```text
二手单件
  inbound_orders.source_type = second_hand
  inventory_items.stock_type = used
  inventory_items.asset_type = single

二手整机
  inbound_orders.source_type = second_hand
  inventory_items.stock_type = used
  inventory_items.asset_type = whole_machine
  whole_machine_components 记录配置快照
```

### 数据库调整

#### 1. inbound_orders

扩展 `source_type` 枚举含义：

```text
purchase_order  来自进货单
opening_stock   历史库存/期初库存
second_hand     二手回收
```

现有 SQLite 表未加 CHECK 约束时，只需要调整前后端类型和校验逻辑。

#### 2. inventory_items

建议新增字段：

```text
stock_type TEXT NOT NULL DEFAULT 'new'
asset_type TEXT NOT NULL DEFAULT 'single'
item_title TEXT
condition_grade TEXT
inspection_note TEXT
listing_price_cents INTEGER
recycle_source_note TEXT
```

字段含义：

| 字段 | 含义 |
| --- | --- |
| `stock_type` | 库存新旧类型，`new` 或 `used` |
| `asset_type` | 库存形态，`single` 或 `whole_machine` |
| `item_title` | 库存件展示名称，整机优先使用 |
| `condition_grade` | 成色，例如 `S`、`A`、`B`、`C`、`faulty` |
| `inspection_note` | 检测备注 |
| `listing_price_cents` | 预期售价，二手库存可用 |
| `recycle_source_note` | 二手来源补充信息，例如个人姓名、电话、平台单号 |

`stock_type` 和 `asset_type` 不建议只靠 `source_type` 推导，因为：

- 历史库存里也可能补录二手。
- 二手整机拆出来的配件来源不是普通采购，但仍是二手单件。
- 后续销售退回、换货回流等场景也可能产生二手库存。

#### 3. whole_machine_components

新增整机配置明细表：

```text
CREATE TABLE whole_machine_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES product_categories(id),
    category TEXT,
    product_id INTEGER REFERENCES products(id),
    component_name TEXT NOT NULL,
    spec TEXT,
    serial_number TEXT,
    condition_grade TEXT,
    cost_share_cents INTEGER,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

索引建议：

```text
idx_whole_machine_components_inventory_item_id
idx_whole_machine_components_product_id
```

说明：

- `inventory_item_id` 指向整机库存件。
- `product_id` 可为空，允许只记录手填配件。
- `cost_share_cents` 第一版可为空，后续拆机时用于成本分摊。

#### 4. 后续拆机预留

第一版可以不建拆机表。如果希望一次性预留，可以后续增加：

```text
whole_machine_disassemblies
whole_machine_disassembly_items
```

并给 `inventory_items.status` 增加：

```text
disassembled
```

第一版如果不做拆解，先不要开放该状态，避免页面出现无法操作的半成品状态。

### 类型调整

涉及类型：

- `InboundOrder.source_type`
- `InventoryItem`
- `SalesProduct.inventory_items`
- 入库页内部 `InboundSourceType`

建议类型：

```ts
type InboundSourceType = 'purchase_order' | 'opening_stock' | 'second_hand';
type StockType = 'new' | 'used';
type AssetType = 'single' | 'whole_machine';
type ConditionGrade = 'S' | 'A' | 'B' | 'C' | 'faulty';
```

`InventoryItem` 增加：

```ts
stock_type: StockType;
asset_type: AssetType;
item_title?: string | null;
condition_grade?: ConditionGrade | null;
inspection_note?: string | null;
listing_price?: number | null;
recycle_source_note?: string | null;
whole_machine_components?: WholeMachineComponent[];
```

### API 调整

#### 1. POST /api/inbound-orders

当前接口只允许 `source_type = opening_stock`，后续需要允许：

```text
opening_stock
second_hand
```

校验规则：

- `purchase_order_id` 只能用于 `purchase_order` 来源。
- `second_hand` 不需要物流公司。
- `second_hand` 不产生采购付款。
- `second_hand` 仍然需要来源方，第一版可以继续要求 `supplier_id`，UI 文案改为“回收来源”。
- 当 `asset_type = whole_machine` 时，数量固定为 1。
- 当 `asset_type = whole_machine` 时，必须填写 `item_title` 和至少一条配置明细。
- 当 `asset_type = single` 时，沿用现有商品、数量、成本、序列号校验。

入库写入：

```text
inbound_orders.source_type = second_hand
inbound_order_items 继续记录商品、数量、成本快照
inventory_items 写入 stock_type / asset_type / 成色 / 检测 / 预期售价
whole_machine_components 写入整机配置
```

#### 2. GET /api/inventory-items

返回库存明细时增加：

```text
stock_type
asset_type
item_title
condition_grade
inspection_note
listing_price
recycle_source_note
whole_machine_components
```

查询参数建议支持：

```text
stock_type=new|used|all
asset_type=single|whole_machine|all
condition_grade=S|A|B|C|faulty
```

#### 3. GET /api/products

商品中心列表聚合建议扩展 `inventory_summary`：

```ts
inventory_summary: {
    in_stock: number;
    used_in_stock: number;
    new_in_stock: number;
    whole_machine_in_stock: number;
    min_cost_price: number | null;
    max_cost_price: number | null;
}
```

第一版至少要能让商品中心看到某个商品下是否有二手库存。

#### 4. GET /api/sales-products

销售选择库存需要带出二手字段：

```text
stock_type
asset_type
item_title
condition_grade
listing_price
```

对于整机库存，展示名称优先级：

```text
inventory_items.item_title
products.name
```

### 前端调整

#### 1. 入库单页面

涉及文件：

```text
app/admin/dashboard/warehouse/inbound/page.tsx
```

调整点：

- `InboundSourceType` 增加 `second_hand`。
- 入库来源 Radio 增加“二手回收”。
- 来源筛选增加“二手回收”。
- 二手回收模式下，商家字段 label 改为“回收来源”。
- 二手回收模式下，不展示进货单导入和采购物流必填项。
- 二手回收模式下，明细区增加“单件 / 整机”选择。
- 单件表单复用 `OpeningStockItemForm`，增加成色、检测备注、预期售价。
- 整机表单新增 `WholeMachineInboundForm`，用于录入整机标题、成本、预期售价、成色和配置明细。

建议组件拆分：

```text
app/admin/dashboard/warehouse/inbound/components/SecondHandSingleItemForm.tsx
app/admin/dashboard/warehouse/inbound/components/WholeMachineInboundForm.tsx
app/admin/dashboard/warehouse/inbound/components/WholeMachineComponentList.tsx
```

当前 `inbound/page.tsx` 已经比较长，新增二手整机后不建议继续把所有 JSX 塞进同一个文件。

#### 2. 商品中心

涉及文件：

```text
app/admin/dashboard/config/_components/ProductDetailDrawer.tsx
app/admin/dashboard/config/_components/ProductTable.tsx
app/admin/dashboard/config/page.tsx
```

调整点：

- 商品列表展示新品/二手库存数量。
- 商品详情在库明细表增加类型、形态、成色、库存名称、预期售价。
- 整机库存提供“查看配置”入口。
- 库存明细支持按新品/二手、单件/整机筛选。

#### 3. 销售订单结算

涉及文件：

```text
app/admin/dashboard/sales/orders/page.tsx
```

调整点：

- 库存选择下拉展示新品/二手、成色、整机标题。
- 对整机库存显示 `item_title`。
- 后续如果销售整机，需要确保订单明细能选择“整机”类目商品，并结算到具体整机库存件。

### 分阶段实施

#### 第一阶段：二手单件

目标：先让二手单件能入库、查看和销售结算识别。

任务：

- 增加 `second_hand` 入库来源。
- `inventory_items` 增加二手属性字段。
- 入库单新增二手单件表单字段。
- 商品中心在库明细展示新品/二手、成色和预期售价。
- 销售结算库存下拉展示二手信息。

验收：

- 可以入库一件二手显示器或 CPU。
- 商品中心能看到该库存为二手，且显示成色和成本。
- 销售结算选择库存时能区分新品和二手。

#### 第二阶段：二手整机

目标：支持二手整机作为一条库存入库，并结构化记录配置。

任务：

- 新增整机类目和通用整机商品。
- 新增 `asset_type = whole_machine`。
- 新增 `whole_machine_components` 表。
- 入库单新增整机入库表单。
- 商品中心支持查看整机配置。
- 销售结算库存下拉展示整机标题。

验收：

- 可以入库一台二手整机。
- 整机只生成一条 `inventory_items`。
- 整机配置可以结构化查看。
- 整机内部配件不会增加普通配件库存。

#### 第三阶段：整机拆解

目标：支持整机从可售整机转为多个配件库存。

任务：

- 新增整机拆解操作。
- 录入拆出配件、成本分摊和成色。
- 原整机库存状态变为 `disassembled`。
- 生成新的二手单件库存。
- 建立拆机来源追溯。

验收：

- 已拆解整机不能再作为整机出售。
- 拆出的配件可以作为二手单件出售。
- 每个拆出配件能追溯到原整机。

## 实施注意事项

1. 不要用 `source_type` 直接替代库存新旧属性。
2. 不要让整机配置配件自动进入库存，否则会造成库存重复。
3. 不要为了每台二手整机强制创建独立商品档案。
4. 二手回收第一版可以复用 `suppliers`，但 UI 文案需要变成“回收来源”。
5. 商品中心和销售结算必须同时显示二手属性，否则入库后的二手信息无法真正参与业务。
6. 整机拆解没有完成前，不要开放会让用户误以为可以拆件销售的按钮。

## 待确认问题

1. 二手回收来源是否继续复用 `suppliers`，还是新增独立“回收来源/客户”管理？
2. 成色枚举是否采用 `S/A/B/C/故障件`，还是使用更贴近门店习惯的文案？
3. 整机预期售价是否进入商品中心定价，还是只作为库存件参考售价展示？
4. 第一版是否需要给二手整机配置明细支持图片或检测截图？
5. 是否允许同一个销售订单同时包含普通配件和一台二手整机？
