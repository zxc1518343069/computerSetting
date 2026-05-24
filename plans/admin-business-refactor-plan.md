# 后台拆分与业务闭环规划

## 背景

当前系统已经从早期的电脑配件报价工具，演进为包含前台报价、套餐推荐、后台产品配置、溢价控制、套餐管理和数据交换的应用。

下一阶段目标是将后台拆分为更贴近门店经营流程的四个领域：

- 仓库管理
- 销售管理
- 财务管理
- 数据管理

整体方向是从“配件报价系统”升级为“装机门店经营管理系统”，让商品、库存、订单、成本和销售数据形成闭环。

## 后台模块规划

### 仓库管理

仓库管理负责维护物品基础信息、进货商家和入库记录。

页面规划：

- 物品列表
    - 对应当前的“系统配置”
    - 管理产品基础信息
    - 新增库存数量字段，默认值为 0
    - 同一个产品型号下可以有多条独立库存
    - 库存明细需要展示每件物品的成本价和序列号；无序列号时展示 `-`
- 进货商家
    - 新增供应商 CRUD
    - 用于物品入库时选择进货来源
- 物品入库
    - 以“入库单”的形式录入
    - 一张入库单支持录入多个产品明细
    - 入库单包含商家、运费、杂费和是否付款
    - 每条产品明细包含物品、入库数量、成本价、产品序列号、质保信息等
    - 提交入库单后生成独立库存明细
    - 每件库存物品拥有独立成本价
    - 入库成本价不更新产品基础档案成本价
    - 入库单提交后不可删除
    - 入库单提交后保留有限编辑和采购退货操作

入库单字段初稿：

- 进货商家
- 运费
- 杂费
- 是否付款
- 入库时间
- 备注

入库明细字段初稿：

- 物品
- 入库数量
- 进货单价或成本价
- 产品序列号，可选
- 是否质保
- 质保时间
- 备注

库存联动：

```text
提交入库单成功 -> 为每件物品生成 inventory_items 库存明细
提交入库单成功 -> products.stock_quantity 按生成的库存明细数量增加
采购退货成功 -> 对应 inventory_items 标记为 returned
采购退货成功 -> products.stock_quantity 减少退货库存数量
```

入库单编辑规则：

- 提交后不允许编辑产品明细、入库数量和成本价
- 允许编辑备注、付款状态、质保信息等非库存数量字段
- 不允许删除入库单
- 采购退货作为独立操作处理，并联动库存

入库单费用规则：

- 运费和杂费只记录在入库单上
- 运费和杂费不分摊到产品成本价
- 运费和杂费需要在财务账单或财务统计中体现

成本价规则：

- 产品基础档案只描述产品型号，不承载唯一成本价
- 每一件库存物品都有自己的独立成本价
- 同一个产品型号可以存在多条库存明细和多个成本价
- 新入库库存不会影响已存在库存物品的成本价
- 订单结算成本来自实际选中的库存物品成本价

前台报价基准价规则：

- 前台产品下拉列表按产品型号去重展示
- 前台展示价格不是某个固定产品基础成本价
- 前台展示价格应从当前可售库存中选择一个基准成本价，再套用溢价策略计算
- 第一版默认取该产品当前可售库存中的最低成本价作为基准成本价
- 如果产品没有可售库存，前台仍允许选择，但必须做细微库存状态标注
- 前台产品选项中使用图标标注库存状态：对号图标代表有库存，错误图标代表无库存
- 后台物品列表需要展示同一产品型号下的库存明细、独立成本价和序列号
- 后台订单结算时仍需选择具体库存物品，最终订单成本以实际选中的库存成本为准
- 无库存产品展示价兜底策略：
    - 优先使用最近一次入库成本价
    - 若没有入库记录，则使用产品参考价
    - 若都没有，则显示“暂无报价”，但仍允许选择

### 销售管理

销售管理负责报价策略、套餐配置和订单管理。

页面规划：

- 物品溢价
    - 对应当前的“溢价控制”
    - 维护统一溢价、分类溢价和取整策略
- 套餐配置
    - 对应当前的“配件套餐”
    - 管理常用装机方案
- 订单列表
    - 新增订单管理页面
    - 订单来源包括前台报价工作台保存的订单

前台报价工作台新增能力：

- 新增“保存为订单”按钮
- 点击后弹出客户信息弹窗
- 弹窗字段：
    - 客户名称，必填
    - 手机号，可选但强提醒
    - 最终成交金额，默认使用当前配置总价；若前台配置已填写最终成交金额，则以该金额为准
    - 备注
- 确认后将当前有效报价配置保存为订单
- 后台“销售管理 / 订单列表”可查看该订单
- 后台订单页面也可以修改最终成交金额

订单库存联动规则：

```text
保存订单成功 -> 不扣减库存
后台订单结算 -> 选择或绑定具体 inventory_items
后台订单结算 -> 将绑定的 inventory_items 标记为 sold
后台订单结算 -> 按已售库存数量扣减 products.stock_quantity
```

库存数量唯一销售扣减入口为后台订单管理中的“结算”操作。前台保存订单只是留单，不改变库存。

允许保存库存不足的 `pending` 订单，但订单列表需要标记库存不足。第一版不允许负库存，若结算时库存不足，提示具体商品库存不足，并阻止结算。

订单库存状态展示规则：

- 后台订单列表需要展示订单库存状态
- 订单详情或结算弹窗中，每条订单明细需要展示对应产品是否有库存
- 使用轻量图标进行提示：对号图标代表库存满足，错误图标代表库存不足或无库存
- 无库存订单允许保存为 `pending`
- 无库存订单不允许结算，除非后续入库后库存满足

订单状态初稿：

- pending: 已保存，待确认
- completed: 已成交
- cancelled: 已取消

前台“保存为订单”后默认状态为 `pending`。后台订单管理需要提供“结算”操作，结算成功后状态变为 `completed`，并扣减库存。

已结算订单取消应理解为“退货”，退货流程暂列 TODO，不在第一版订单闭环中实现。

订单成本规则：

- 订单保存时只保存产品配置和销售价格，不锁定库存成本
- 订单结算时需要绑定具体库存物品
- 订单成本等于被绑定库存物品的独立成本价之和
- 后续新入库不会影响已结算订单成本

最终成交金额编辑规则：

- 只允许 `pending` 订单修改最终成交金额
- `completed` 订单不可直接修改最终成交金额
- 财务统计以 `final_amount` 为准

UI 风格要求：

- 整体保持当前后台风格
- 继续使用 Ant Design + Tailwind CSS
- 延续当前的浅色/深色主题、玻璃拟态、圆角卡片、柔和阴影和科技感页面头部
- 新增页面优先复用现有后台页面的布局节奏、按钮风格、表格样式和弹窗样式

### 财务管理

财务管理负责查看销售数据和维护经营成本。

页面规划：

- 销售数据
    - 基于订单统计销售额、成本、毛利、订单数量等
    - 后续可结合经营成本计算净利润
- 成本管理
    - 上方为搜索表单
    - 下方为成本表格
    - 支持新增、编辑、删除、查询
    - 用于维护房租、人工工资、水电费、杂费等支出

成本类型初稿：

- rent: 房租
- salary: 人工工资
- utilities: 水电费
- misc: 杂费
- shipping: 运费
- purchase_misc: 入库杂费

### 数据管理

数据管理负责导入导出和数据维护。

页面规划：

- 数据交换
    - 对应当前的“数据交换”
    - 第一阶段先迁移现有能力
    - 后续扩展为产品、供应商、入库、订单、成本等多 sheet 导入导出

## 建议路由结构

```text
/admin/dashboard/warehouse/products
/admin/dashboard/warehouse/suppliers
/admin/dashboard/warehouse/inbound

/admin/dashboard/sales/pricing
/admin/dashboard/sales/packages
/admin/dashboard/sales/orders

/admin/dashboard/finance/sales
/admin/dashboard/finance/costs

/admin/dashboard/data/exchange
```

旧路由建议短期保留并重定向：

```text
/admin/dashboard/config   -> /admin/dashboard/warehouse/products
/admin/dashboard/pricing  -> /admin/dashboard/sales/pricing
/admin/dashboard/packages -> /admin/dashboard/sales/packages
/admin/dashboard/import   -> /admin/dashboard/data/exchange
```

## 数据模型初稿

### products 扩展

当前 `products` 继续作为物品基础档案。

新增字段：

```text
stock_quantity integer not null default 0
```

含义：

- 表示当前可用库存数量
- 新增物品时默认为 0
- 由独立库存明细汇总得到
- 入库生成库存明细并增加库存
- 订单结算绑定库存明细并减少库存

说明：

- `products` 不再表示某一件真实库存物品
- `products.price` 如继续保留，应理解为报价或默认参考价，不作为库存成本唯一来源
- 真实成本价存放在 `inventory_items.cost_price`

### 产品报价视图

前台报价和套餐选择需要一个按产品型号去重后的列表。

建议通过服务端查询或视图生成下列字段：

```text
product_id
category
name
stock_quantity
base_cost_price
display_price
```

说明：

- `base_cost_price` 第一版取当前 `in_stock` 库存中的最低 `cost_price`
- `display_price` 基于 `base_cost_price` 和溢价配置计算
- 若无可售库存，`base_cost_price` 可为空，前台标记无库存
- 若无可售库存但产品仍允许选择，展示价按“最近一次入库成本价 -> 产品参考价 -> 暂无报价”的优先级兜底
- 该视图只用于报价展示，不代表订单最终成本

### suppliers

进货商家表。

```text
id
name
contact_name
phone
address
note
created_at
updated_at
```

### inventory_items

独立库存物品表。每条记录代表一件真实库存物品。

```text
id
product_id
supplier_id
inbound_order_id
inbound_order_item_id
cost_price
serial_number
warranty_enabled
warranty_until
inbound_at
status
note
created_at
updated_at
```

说明：

- `serial_number` 选填；无序列号时列表展示 `-`
- 若填写序列号，则序列号应唯一
- `status` 可为 `in_stock`、`sold`、`returned`
- 同一产品型号可以对应多条 `inventory_items`
- 同一产品型号下不同库存物品可以有不同 `cost_price`

### orders

订单主表。

```text
id
order_no
customer_name
customer_phone
original_amount
final_amount
discount_amount
cost_amount
profit_amount
status
source
note
sold_at
created_at
updated_at
```

说明：

- `source` 可记录订单来源，例如 `frontend_quote`
- `original_amount` 记录配置总价
- `final_amount` 记录最终成交金额，订单统计以该字段为准
- `discount_amount` 可由 `original_amount - final_amount` 计算或落库
- 客户信息第一版只保留客户名称和手机号

### order_items

订单明细表。

```text
id
order_id
product_id
inventory_item_id
product_name
product_category
quantity
cost_price
sale_price
created_at
```

第一版建议保存产品和库存成本快照字段，避免后续产品改名或库存变化影响历史订单。结算后 `inventory_item_id` 指向实际售出的库存物品，
`cost_price` 取该库存物品的独立成本价。

### operating_costs

经营成本表。

```text
id
type
name
amount
cost_date
note
created_at
updated_at
```

### inbound_orders

入库单主表。

```text
id
supplier_id
shipping_fee
misc_fee
is_paid
inbound_at
note
created_at
updated_at
```

说明：

- 运费、杂费不分摊到产品成本价
- 运费、杂费需要进入财务统计
- 入库单提交后不可删除
- 入库单支持有限编辑和采购退货

### inbound_order_items

入库单明细表。

```text
id
inbound_order_id
product_id
quantity
purchase_price
warranty_enabled
warranty_until
note
created_at
updated_at
```

说明：

- 入库明细记录一次录入的产品、数量和单件成本
- 提交入库单时根据 `quantity` 生成对应数量的 `inventory_items`
- 序列号归属到具体 `inventory_items`

### inbound_returns

采购退货记录表。

```text
id
inbound_order_id
supplier_id
return_amount
note
returned_at
created_at
updated_at
```

### inbound_return_items

采购退货明细表。

```text
id
inbound_return_id
inventory_item_id
product_id
purchase_price
created_at
```

说明：

- 采购退货基于具体库存物品处理
- 采购退货成功后将对应 `inventory_items.status` 改为 `returned`
- 采购退货成功后扣减对应产品库存数量
- 采购退货金额后续需要在财务统计中体现

## 实施阶段建议

### 第一阶段：后台结构拆分

目标：

- 重组后台导航为四大模块
- 迁移现有页面到新路由
- 保留旧路由重定向
- 暂不改变现有业务逻辑

交付：

- 仓库管理 / 物品列表
- 销售管理 / 物品溢价
- 销售管理 / 套餐配置
- 数据管理 / 数据交换

### 第二阶段：仓库管理闭环

目标：

- 扩展 products 库存字段
- 新增进货商家 CRUD
- 新增物品入库 CRUD
- 入库时增加库存数量

交付：

- 进货商家页面
- 物品入库页面
- products.stock_quantity 自动更新

### 第三阶段：订单闭环

目标：

- 新增订单数据表和 API
- 前台报价工作台支持保存为订单
- 后台订单列表可查看订单
- 后台订单管理提供结算操作
- 订单结算时扣减库存

交付：

- 前台“保存为订单”
- 客户信息弹窗
- 销售管理 / 订单列表
- 订单结算操作
- 结算扣减库存逻辑

### 第四阶段：财务管理

目标：

- 新增成本管理 CRUD
- 新增销售数据统计页面
- 初步统计销售额、成本、毛利和经营成本

交付：

- 财务管理 / 成本管理
- 财务管理 / 销售数据

### 第五阶段：数据交换升级

目标：

- TODO：将现有数据交换从产品维度扩展到更多业务数据
- 第一版先不实现新业务数据的数据交换兼容，等仓库、订单、财务功能稳定后再补

交付：

- 产品导入导出
- 供应商导入导出
- 入库记录导入导出
- 订单导出
- 成本导入导出

## 待确认问题

1. 采购退货金额暂列 TODO，后续单独设计。
2. 销售订单退货流程暂列 TODO，后续单独设计。

## 实施 TODO

已完成第一版后台拆分、基础供应商、入库、订单、成本和销售数据页面。后续仍需补强：

- 数据库迁移需要在 Supabase 执行 `database/schema.sql` 中新增表和字段。
- 订单结算目前通过 API 顺序写入，后续建议迁移到 Supabase RPC 或数据库事务，避免中途失败造成部分写入。
- 采购退货已保留业务入口规划，但第一版暂未实现采购退货页面和 API。
- 销售退货暂未实现，后续需要独立设计退货、库存回滚和财务冲销。
- 数据交换暂未兼容供应商、入库、库存、订单和成本数据。
- 前台无库存产品报价基准价兜底策略已记录，但当前产品接口仍以现有产品参考价和库存数量为主，后续需接入最近入库价聚合。
- 物品列表当前展示型号库存数量，后续需增加同型号库存明细展开，展示每件库存成本价和序列号。
- 前台“保存订单”第一版仅后台登录态可用，避免未登录 mock 数据写入真实订单。
