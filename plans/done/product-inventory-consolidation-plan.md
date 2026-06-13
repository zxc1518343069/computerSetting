# 商品信息与库存状况合并方案

## 状态

- 当前阶段：已完成，准备归档
- 放置目录：`plans/done/`
- 结论：改动不大，建议合二为一
- 核心原则：合并用户入口和页面体验，不合并底层数据概念

## 实际完成情况

- 商品信息和库存状况已合并为后台“商品中心”。
- 商品中心列表展示当前在库数量和在库成本区间。
- 商品详情抽屉只展示当前 `in_stock` 库存件，不展示已售、已退货历史库存。
- `GET /products` 已返回 `inventory_summary`，并支持按当前在库序列号、商家搜索。
- 后台侧边栏已移除“库存状况”和“销售报价”。
- `/admin/dashboard/warehouse/products` 已重定向到 `/admin/dashboard/config`。
- `/admin/dashboard/sales/products` 已重定向到 `/admin/dashboard/config`。
- `/admin/dashboard` 默认入口已调整为商品中心。
- `/api/sales-products` 保留，继续作为首页报价、套餐、订单调整等内部功能的数据源。

验证结果：

- `npm run lint` 通过，仅保留既有 `app/gamesList/_components/GameCard.tsx` 的 `<img>` warning。
- `npm run build` 通过。
- `npm run dev` 的 Turbopack 字体启动问题已通过移除 `next/font/google` 解决。

## 背景

当前后台存在三个容易让用户混淆的商品相关入口：

- `/admin/dashboard/config`：商品信息，维护产品基础档案、类目、参考价、售价策略。
- `/admin/dashboard/warehouse/products`：库存状况，按单件库存展示序列号、商家、成本、质保和状态。
- `/admin/dashboard/sales/products`：销售列表，按产品型号聚合可售库存、成本区间和建议售价。

其中“商品信息”和“库存状况”在用户心智上非常接近。实际业务中，用户往往先找到一个商品型号，再查看它当前有哪些在库库存件、序列号、商家和成本。因此这两个入口可以合并为一个“商品中心”。

后续讨论进一步确认：本系统的报价动作主要发生在首页，后台定位是商品、库存、价格策略、套餐、订单等管理配置，不是销售开单工作台。因此 `/admin/dashboard/sales/products` 不应继续作为一个独立后台菜单存在。它与商品中心在后台管理视角下重复，建议从侧边栏移除并保留兼容重定向；其背后的 `/api/sales-products` 仍可作为前台报价、套餐、订单调整等功能的价格聚合数据源。

但 `products` 和 `inventory_items` 不应在数据模型上合并：

- `products` 表示商品型号或基础档案，例如某个 CPU、显卡或显示器型号。
- `inventory_items` 表示某一件真实库存，有独立成本、序列号、商家、入库时间、质保和状态。

两者是一对多关系。正确做法是让商品列表成为主入口，把库存明细放进商品详情中。

## 产品方案

### 目标

1. 让用户只从一个入口管理和查看商品相关信息。
2. 保留按商品型号维护基础资料的能力。
3. 在商品详情里集中查看当前在库明细、序列号、商家、成本和质保信息。
4. 减少“商品信息”和“库存状况”两个列表之间来回切换。
5. 移除后台“销售报价”页面入口，避免后台出现另一个商品列表；报价体验仍由首页承担。

### 导航调整

建议调整后台侧边栏：

```text
仓库管理
- 商品中心
- 商品类目
- 供货商信息
- 进货/退货
- 入库单

销售管理
- 物品溢价
- 套餐配置
- 订单列表
- 客户信息
```

对应关系：

| 现有入口                                       | 建议处理       | 说明                                       |
| ---------------------------------------------- | -------------- | ------------------------------------------ |
| 商品信息 `/admin/dashboard/config`             | 改名为商品中心 | 作为合并后的主入口                         |
| 库存状况 `/admin/dashboard/warehouse/products` | 合并进商品详情 | 不再作为一级菜单展示                       |
| 销售列表 `/admin/dashboard/sales/products`     | 从菜单移除     | 后台不再保留重复商品报价列表，旧路由重定向 |

后台默认页建议从 `/admin/dashboard/sales/products` 调整为 `/admin/dashboard/config`。用户进入后台时优先看到商品中心，符合“后台负责管理，首页负责报价”的产品边界。

### 商品中心列表

列表仍以商品型号为粒度，每行表示一个 `Product`。

建议展示字段：

- 商品类目
- 产品名称
- 条形码
- 参考价格
- 当前库存
- 在库成本区间
- 最终售价或建议售价
- 操作：详情、编辑、删除

列表搜索建议支持：

- 产品名称
- 条形码
- 序列号
- 商家名称

如果搜索词命中某个在库库存件的序列号或商家，也应返回对应商品型号。这样即使去掉库存状况一级入口，用户仍然可以从商品中心查到当前有效库存。

### 商品详情

点击“详情”后，建议使用抽屉或详情页。第一版优先使用抽屉，改动更小，也能复用当前表格页面。

详情分为以下 Tab：

1. 基础信息
    - 商品类目
    - 产品名称
    - 条形码
    - 参考价格
    - 手动定价
    - 是否使用自动溢价
    - 创建时间、更新时间

2. 库存明细
    - 库存 ID
    - 序列号
    - 商家名称
    - 成本
    - 入库时间
    - 质保
    - 备注

库存明细只展示当前 `in_stock` 库存件。已售、已退货属于历史或无效库存信息，不进入商品中心第一版；需要追溯时，到订单列表、采购退货、入库单等业务页面查看。

第一版必须完成“基础信息”和“当前在库明细”。库存明细中可以保留 `inbound_order_id`、`inbound_order_item_id` 的跳转空间，但不在本页展开完整历史。

### 库存状态统计

商品中心顶部统计建议改为：

- 商品型号数
- 在库件数
- 在库成本合计，可选
- 有库存型号数

单个商品详情顶部建议展示：

- 当前在库
- 在库成本区间
- 最近入库时间

### 不纳入本次范围

以下内容不在第一版合并内：

- 修改数据库表结构。
- 把 `products` 与 `inventory_items` 物理合表。
- 重做入库、采购、订单结算流程。
- 商品详情中的完整采购/销售时间线。
- 已售库存、已退货库存的历史明细展示。
- 库存件编辑能力。库存件仍通过入库、退货、订单结算等业务流程产生和变更。

## 技术方案

### 总体策略

保留现有模型和 API，以前端页面聚合为主：

```text
Product 列表
  -> 商品详情抽屉
      -> 基础信息
      -> inventory_items 明细
```

第一版可以不新增数据库迁移。当前已有接口已经能支撑主要能力：

- `GET /products`：获取商品基础列表。
- `GET /products/:id`：获取商品详情。
- `GET /inventory-items?product_id=:id`：获取某个商品下当前在库库存件，接口默认 `status=in_stock`。
- `GET /sales-products`：获取可售库存和建议售价聚合数据，继续供首页报价、套餐和订单调整等内部功能使用；不再对应独立后台菜单。

### 前端改造

#### 1. 合并页面入口

建议保留 `/admin/dashboard/config` 作为实际页面路径，降低迁移成本。

改造点：

- 将页面标题从“硬件配置中心”调整为“商品中心”。
- 页面描述调整为“管理商品基础信息，并查看当前在库库存、序列号和成本”。
- 侧边栏中 `/admin/dashboard/config` 的标题从“商品信息”调整为“商品中心”。
- 从侧边栏移除 `/admin/dashboard/warehouse/products`。
- `/admin/dashboard/warehouse/products` 短期保留路由，自动重定向到 `/admin/dashboard/config`，避免旧链接失效。
- 从侧边栏移除 `/admin/dashboard/sales/products`。
- `/admin/dashboard/sales/products` 短期保留路由，自动重定向到 `/admin/dashboard/config`，避免旧链接失效。
- `/admin/dashboard` 默认重定向到 `/admin/dashboard/config`。

涉及文件：

- `app/admin/dashboard/layout.tsx`
- `app/admin/dashboard/config/page.tsx`
- `app/admin/dashboard/warehouse/products/page.tsx`
- `app/admin/dashboard/sales/products/page.tsx`
- `app/admin/dashboard/page.tsx`

#### 2. 商品中心列表增强

在 `app/admin/dashboard/config/page.tsx` 和 `ProductTable` 中增加库存维度展示。

建议字段来源：

- 商品基础字段继续使用 `GET /products`。
- 当前库存可以继续使用 `Product.stock_quantity`。
- 在库成本区间需要新增聚合来源。

为了避免每行单独请求库存明细，建议新增一个轻量聚合接口或增强 `GET /products`。

推荐增强 `GET /products`：

```ts
interface Product {
    id: number;
    name: string;
    stock_quantity: number;
    inventory_summary?: {
        in_stock: number;
        min_cost_price: number | null;
        max_cost_price: number | null;
    };
}
```

后端可以通过对 `inventory_items` 按 `product_id` 聚合得到：

```sql
SELECT
    product_id,
    SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) AS in_stock_count,
    MIN(CASE WHEN status = 'in_stock' THEN cost_price_cents END) AS min_cost_price_cents,
    MAX(CASE WHEN status = 'in_stock' THEN cost_price_cents END) AS max_cost_price_cents
FROM inventory_items
GROUP BY product_id
```

如果希望 API 变更更保守，也可以新增 `GET /products/summary` 或 `GET /product-inventory-summary`。但从现有页面改造成本看，增强 `GET /products` 更直接。

#### 3. 商品详情抽屉

新增组件建议：

```text
app/admin/dashboard/config/_components/ProductDetailDrawer.tsx
```

职责：

- 接收 `product` 或 `productId`。
- 打开时请求 `GET /inventory-items?product_id=:id`。
- 使用 Ant Design `Drawer` + `Tabs` + `Descriptions` + `Table`。
- 基础信息 Tab 展示商品信息。
- 库存明细 Tab 展示该商品当前在库库存件。

与现有组件关系：

- `ProductModal` 继续负责新增/编辑。
- `ProductTable` 增加 `onViewDetail` 回调。
- `ConfigPage` 维护 `detailProduct` 状态并渲染 `ProductDetailDrawer`。

#### 4. 搜索能力增强

当前 `GET /products` 只搜索产品名称和条形码。合并后建议扩展为：

- 产品名称
- 条形码
- 库存序列号
- 供应商名称

实现方式：在 `GET /products` 中增加 `EXISTS` 子查询：

```sql
OR EXISTS (
    SELECT 1
    FROM inventory_items ii
    LEFT JOIN suppliers s ON s.id = ii.supplier_id
    WHERE ii.product_id = p.id
      AND ii.status = 'in_stock'
      AND (ii.serial_number LIKE @search OR s.name LIKE @search)
)
```

这样移除库存状况一级入口后，仍然可以快速按当前在库序列号定位商品。已售或已退货的历史序列号不在商品中心搜索范围内，避免把无效库存带回管理视图。

#### 5. 后台销售报价页移除入口

`/admin/dashboard/sales/products` 不再作为后台页面入口展示，因为后台不是报价工作台，报价动作主要发生在首页。

处理方式：

- 从侧边栏移除销售报价菜单。
- 旧页面保留为重定向到商品中心。
- 保留 `GET /sales-products` API，不删除、不重命名，避免影响首页报价、套餐、订单调整等依赖。
- 如果后续需要后台查看销售价格聚合，可以在商品中心或价格配置页增加只读辅助信息，而不是恢复一个独立商品列表。

### 后端改造

#### 1. 增强 `GET /products`

文件：`app/api/products/route.ts`

建议改动：

- 在商品列表 SQL 中左连接库存聚合子查询。
- 返回 `inventory_summary`。
- 搜索条件支持序列号和供应商名称。

序列化方式有两种：

1. 直接在 route 中拼装 `inventory_summary`，不影响通用 `serializeProduct`。
2. 扩展 `ProductRow` 和 `serializeProduct`，让所有产品返回都带 summary。

推荐第一种，改动更小，也避免影响前台报价、套餐等已有调用。

#### 2. 复用 `GET /inventory-items`

文件：`app/api/inventory-items/route.ts`

现有接口已经支持：

- `product_id`
- 默认 `status=in_stock`
- `search`
- `category_id`

商品详情库存明细直接调用默认在库筛选：

```text
GET /inventory-items?product_id=123
```

第一版无需新增详情接口。

#### 3. 保留库存数量同步逻辑

当前 `products.stock_quantity` 由入库、退货、订单结算等流程同步。合并页面后不要把列表上的库存数量变成可编辑字段，避免破坏库存闭环。

### 路由兼容

短期建议保留 `/admin/dashboard/warehouse/products` 页面，改为重定向：

```ts
import { redirect } from 'next/navigation';

export default function WarehouseProductsPage() {
    redirect('/admin/dashboard/config');
}
```

如果担心用户需要全局库存台账，可以先不删除原页面文件，只从菜单移除，并在商品中心上线稳定后再决定是否归档。

`/admin/dashboard/sales/products` 同样保留兼容重定向：

```ts
import { redirect } from 'next/navigation';

export default function SalesProductsPage() {
    redirect('/admin/dashboard/config');
}
```

## 实施步骤

### 第一阶段：小步合并

1. 调整侧边栏文案：商品信息 -> 商品中心。
2. 从侧边栏移除库存状况入口。
3. 将 `/warehouse/products` 重定向到 `/config`。
4. 调整商品中心页面标题、描述和统计卡片。
5. 增强 `GET /products`，返回当前在库聚合。
6. 在 `ProductTable` 增加“详情”操作和库存统计列。
7. 新增 `ProductDetailDrawer`，展示基础信息和当前在库明细。
8. 搜索支持序列号和供应商名称。
9. 从侧边栏移除后台销售报价入口。
10. 将 `/sales/products` 重定向到 `/config`。
11. 将 `/admin/dashboard` 默认入口调整到 `/config`。

### 第二阶段：体验增强

1. 商品详情增加采购/入库来源跳转。
2. 根据当前库存状态增加筛选项，例如全部商品、仅有库存、无库存。
3. 如确有需要，再提供一个只读的“库存台账”高级入口，但不放在一级菜单；该入口应清楚标注为历史查询或库存追溯，不作为商品中心主体验。

## 验收标准

1. 侧边栏中不再同时出现“商品信息”和“库存状况”两个相似入口。
2. 用户进入“商品中心”即可完成商品基础资料维护。
3. 用户在商品中心点击详情，可以看到该商品当前在库库存件、序列号、商家、成本和质保。
4. 用户可以通过当前在库序列号或商家名称搜索到对应商品。
5. 后台侧边栏不再出现“销售报价”入口。
6. 入库、采购退货、订单结算等库存变更流程不受影响。
7. 旧链接 `/admin/dashboard/warehouse/products` 不报 404。
8. 旧链接 `/admin/dashboard/sales/products` 不报 404，并跳转到商品中心。
9. `GET /sales-products` API 仍然可用。

## 测试建议

### 手动测试

1. 打开商品中心，确认商品列表、类目筛选、名称搜索正常。
2. 用当前在库序列号搜索，确认能定位到对应商品。
3. 点击商品详情，确认库存明细只展示当前在库库存。
4. 对有库存、无库存的商品分别打开详情检查。
5. 新增或编辑商品后，确认详情和列表刷新正常。
6. 访问旧库存状况 URL，确认能跳转到商品中心。
7. 访问旧销售报价 URL，确认能跳转到商品中心。
8. 调用 `/api/sales-products`，确认接口仍然可用。

### 命令检查

```bash
npm run lint
npm run build
```

## 风险与应对

| 风险                       | 说明                                 | 应对                                                                               |
| -------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| 用户仍需要全局库存台账     | 合并后少了直接按库存件浏览的一级入口 | 商品中心搜索支持当前在库序列号和商家；必要时保留隐藏的历史查询入口                 |
| `GET /products` 聚合变慢   | 商品和库存增多后聚合查询成本上升     | 给 `inventory_items.product_id`、`status`、`serial_number` 建索引，后续再优化      |
| 后续找不到销售报价聚合视图 | 后台移除独立销售报价页面             | 保留 `/api/sales-products`；报价动作回到首页，后台价格配置由物品溢价和商品中心承担 |
| 删除商品规则更难理解       | 有库存记录的商品本来就不能删除       | 删除失败时提示“该商品已有库存记录，无法删除，可停用或保留历史”                     |

## 最终建议

本次建议执行“轻合并”：

- 合并 `商品信息` 和 `库存状况` 的用户入口。
- 商品中心作为唯一的商品管理入口。
- 当前在库明细放入商品详情。
- 移除后台销售报价页面入口，避免和商品中心重复；保留 `sales-products` API 给首页报价和内部功能使用。
- 不改数据库主模型，不重做库存流程。

这个方案改动范围可控，能明显降低后台菜单重复感，同时避免把已售、已退货等历史信息混入当前商品管理视图。
