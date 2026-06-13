# 前台导航与产品零售改造方案

## 状态

- 当前阶段：已实现，完成基础验证
- 放置目录：`plans/done/`
- 核心结论：前台入口按业务场景拆分，底层订单和报价能力尽量复用
- 导航原则：`DIY整机` 是主入口，点击默认进入装机配置页，下拉只放附属入口

## 背景

改造前前台导航包含：

- `装机配置`：指向首页 `/`，承载 DIY 整机配置单。
- `游戏榜单`：指向 `/gamesList`。
- `价格方案`：指向 `/pricing`。

当前首页配置单已经具备以下能力：

- 按硬件类别选择产品。
- 支持部分分类添加多条，例如内存、存储、散热、显示器。
- 实时计算价格。
- 临时保存方案。
- 导出报价单。
- 保存订单。
- 从左侧套餐推荐套用整机配置。

但当前首页的业务语义是“DIY 整机配置”，不是“任意硬件零售”。产品零售场景需要像销售明细单一样默认提供空白行，让用户在行内选择硬件类别和对应产品，并且任意类别都应支持添加多条。

## 目标

1. 删除前台导航中的 `价格方案` 入口。
2. 将 `装机配置` 升级为 `DIY整机` 主导航。
3. `DIY整机` 点击默认跳转 `/`，也就是当前装机配置页。
4. `DIY整机` hover 下拉只展示 `游戏榜单`，不重复展示 `装机配置`。
5. 新增 `产品零售` 前台入口。
6. 新增 `二手`、`租赁` 前台入口，第一阶段先做 TODO 占位页。
7. 产品零售支持：选择硬件类别、选择产品、添加多条、修改数量、计算小计和合计。
8. 产品零售复用现有保存订单和导出报价单逻辑，尽量不改后端订单结构。

## 非目标

1. 本次不删除 `/pricing` 页面文件，只从前台导航移除入口，避免历史链接直接失效。
2. 本次不改订单、订单明细、结算绑定库存的数据表结构。
3. 本次不实现二手商品完整业务流。
4. 本次不实现租赁周期、押金、归还、逾期等租赁业务流。
5. 本次不重构后台商品、库存、套餐管理页面。

## 前台信息架构

落地导航结构：

```text
前台导航
- DIY整机 /
  - 游戏榜单 /gamesList
- 产品零售 /retail
- 二手 /second-hand
- 租赁 /rental
```

说明：

- `DIY整机` 自身就是可点击入口，点击后进入当前首页装机配置。
- `装机配置` 不再作为下拉项出现，避免主入口和子入口重复。
- `游戏榜单` 作为 DIY 整机的辅助决策内容，放入 `DIY整机` 的 hover 下拉中。
- `产品零售`、`二手`、`租赁` 是与 DIY 整机平级的销售场景。

## 页面定位

### DIY整机

保留当前首页能力，继续服务整机配置和套餐推荐：

- 路由：`/`
- 主组件：`app/_components/PCPartsTable/index.tsx`
- 侧边栏：保留热门方案和临时方案。
- 主表格：保留当前按整机配置类别组织的体验。
- 操作：临时保存、导出报价单、保存订单、测试配置保持不变。

### 产品零售

已新增独立前台页面，服务单品或多品类硬件销售：

- 路由：`/retail`
- 页面标题：`产品零售`
- 核心心智：默认给出空白明细行，用户在行内依次选择硬件类别和对应产品。

落地交互：

1. 页面默认展示一条空白零售明细行。
2. 用户在行内先选择硬件类别，再选择该类别下的产品。
3. 点击 `添加一行` 时直接新增一条空白明细，不需要先在顶部选择类别。
4. 任意类别都允许添加多条。
5. 行内支持数量调整、删除、单价和小计展示。
6. 页面底部展示合计金额，可继续支持优惠后价格。
7. 顶部操作保留 `导出报价单`、`保存订单`。

### 二手

第一阶段已新增 TODO 占位页：

- 路由：`/second-hand`
- 占位内容：模块建设中。
- 后续可扩展：二手库存、成色、保修、回收来源、单件成本、售后备注。

### 租赁

第一阶段已新增 TODO 占位页：

- 路由：`/rental`
- 占位内容：模块建设中。
- 后续可扩展：租期、押金、日租/月租、归还状态、逾期费用、租赁合同信息。

## 现状梳理

### 1. 前台导航

当前导航集中在 `app/_components/SiteHeader.tsx`：

- `navItems` 当前包含 `装机配置`、`游戏榜单`、`价格方案`。
- 登录状态、退出登录、主题切换和时间展示已经在同一组件内完成。
- 当前导航项都是普通 `Link`，还没有业务分组下拉。

结论：导航改造可以局部完成，不需要调整全局 layout。`DIY整机` 需要从普通导航项升级成“可点击主项 + hover 下拉项”。

### 2. DIY 整机页面

当前首页 `app/page.tsx` 直接渲染 `PCPartsTable`。

`app/_components/PCPartsTable/index.tsx` 负责页面框架：

- 内部渲染 `SiteHeader`。
- 左侧渲染 `PackageRecomment`，支持热门方案和临时方案。
- 主工作区渲染 `Content`。
- 通过 `customRef` 支持将套餐推荐应用到配置表。

`app/_components/PCPartsTable/Content/index.tsx` 负责核心配置业务：

- 调用 `useTableControl` 管理配置表行。
- 调用 `usePackageTableData` 获取产品和定价配置。
- 调用 `usePackageCalculator` 计算单价、小计、合计和利润指标。
- 调用 `ExportButton` 导出报价单图片。
- 调用 `saveOrder` 保存订单。
- 包含客户、经手人、订单金额、备注等保存订单弹窗逻辑。

结论：DIY 整机页面已经形成“页面框架 + 业务内容 + 表格能力”的结构。零售不应破坏这条链路，尤其不应为了零售改动套餐推荐和测试配置。

### 3. 当前表格组件

当前可编辑表格位于 `app/admin/dashboard/packages/components/EditablePackageTable/EditablePackageTable.tsx`，虽然在前台 DIY 页面也被复用，但它本质上是“套餐/整机配置表”。

它的关键特征：

- 内部直接遍历固定 `PACKAGE_CATEGORIES`。
- 每个分类按固定顺序展示。
- 只有 `ram`、`storage`、`cooling`、`monitor` 被视为可多选分类。
- 行展示是“分类分组 + 首行展示分类名 + 首行显示添加按钮”。
- 产品行使用 `ProductRow`，产品选择使用 `ProductSelect`。

结论：这张表适合 DIY 整机，不适合直接承担零售。若为了零售给它增加 `mode="retail"`、动态分类、任意多行、类别选择等逻辑，会让后台套餐、前台 DIY 和前台零售三个场景耦合在一张表里，后续维护成本偏高。

### 4. 行数据与产品选择

当前行数据类型 `EditablePartRow` 定义在 `app/admin/dashboard/packages/types.ts`：

```ts
interface EditablePartRow {
    id: string;
    category: string;
    product_id: number;
    quantity: number;
    product_name?: string;
    product_price?: number;
    product_category?: string;
    custom_name?: string;
    custom_price?: number;
}
```

该结构已经能表达零售明细行。`ProductSelect` 支持：

- 按产品名称搜索。
- 按条形码搜索。
- 展示库存状态图标。
- 自定义商品名称输入。

结论：第一版零售可以继续复用 `EditablePartRow` 和 `ProductSelect`。中长期可将 `EditablePartRow` 重命名或抽象为更通用的 `QuoteLineItem`，但第一版不必先做类型大迁移。

### 5. 价格计算

当前价格计算位于：

- `app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageCalculator.ts`
- `utils/pricing.ts`

`usePackageCalculator(products, pricingConfig, items)` 接收任意 `items` 数组，并不强依赖固定装机分类。底层 `PricingCalculator` 支持：

- 根据 `selling_price` 优先使用手动售价。
- 根据 `is_use_premium` 判断是否使用自动溢价。
- 根据 `category_id` 或旧版 `category` 获取分类溢价。
- 支持统一溢价和分类溢价。
- 支持取整规则。
- 支持自定义商品价格。

结论：价格计算能力可以直接复用。虽然命名里有 `Package`，但功能更接近通用报价计算器，第一版不急于重命名，避免扩大改动面。

### 6. 报价单导出

当前导出入口是 `app/_components/PCPartsTable/Content/components/ExportButton.tsx`，实际图片生成在 `utils/canvasExport.ts`。

当前限制：

- `ExportButton` 文件名写死为 `明远装机报价单_日期.png`。
- `canvasExport.generateQuoteImage` 过滤有效项时只保留 `product_id > 0` 的行，自定义商品可能不会被导出。
- `generateQuoteImage` 绘制顺序依赖 `PACKAGE_CATEGORIES_LIST`，不适合动态零售分类或任意行顺序。
- 画面标题和底部信息偏整机报价单语义。

结论：导出按钮交互可以复用，但 `canvasExport` 需要增加少量通用配置，至少支持零售标题、文件名前缀和行排序方式；自定义商品能力仅作为导出工具的兼容能力保留，零售第一版 UI 不开放自定义录入。

### 7. 保存订单

当前保存订单链路：

- 前端服务：`saveOrder`，位于 `app/admin/dashboard/services.ts`。
- 后端接口：`POST /api/orders`。
- 订单明细字段包含 `product_id`、`product_name`、`product_category`、`quantity`、`sale_price`。
- 当前 DIY 整机订单来源为 `source: 'frontend_quote'`。

结论：产品零售不需要新增订单接口。第一版可以继续调用 `saveOrder`，只需将来源设置为 `frontend_retail`，并保证订单明细仍符合现有结构。

### 8. 分类来源

当前项目同时存在两类分类来源：

- 固定分类：`const/categories.ts` 中的 `PACKAGE_CATEGORIES` 和 `CATEGORY_CONFIG`。
- 动态分类：`app/services/categories.ts` 和 `GET /api/product-categories`。

DIY 整机目前仍依赖固定分类顺序，产品和定价配置已经开始支持 `category_id`、`category_label`、`category_tag_color` 等动态字段。

结论：产品零售应优先使用动态分类，避免继续扩大固定分类的使用范围。DIY 整机可以暂时保持现状，后续再单独做动态分类迁移。

## 落地结果

### 已完成内容

1. `SiteHeader` 已完成前台导航调整：删除 `价格方案`，新增 `产品零售`、`二手`、`租赁`，`DIY整机` 点击进入 `/`，hover 下拉只展示 `游戏榜单`。
2. `/retail` 已新增产品零售页，默认展示一条空白零售明细行。
3. 产品零售支持行内选择硬件类别、选择产品、修改数量、删除行、计算总价和最终成交金额。
4. `添加一行` 直接插入空白明细，不再要求先在顶部选择类别。
5. 删除最后一行后会自动恢复一条空白行，保持销售明细单可直接编辑。
6. 零售页已复用现有产品、定价、保存订单和报价导出链路，订单来源为 `frontend_retail`。
7. `/second-hand` 和 `/rental` 已新增建设中占位页。
8. `ProductSelect` 已提取为共享组件 `app/_components/QuoteProductSelect.tsx`，原后台套餐表格路径保留 re-export 兼容。
9. `ExportButton` 已支持 `filenamePrefix`，`canvasExport` 已支持零售标题、输入顺序和动态分类标签。
10. 已更新计划文档以匹配当前实现。

### 验证结果

- `npm run lint` 通过，仅保留既有 `app/gamesList/_components/GameCard.tsx` 的 `<img>` 优化 warning。
- `npm run build` 通过。
- 本地验证 `/retail`、`/second-hand`、`/rental` 均可访问。

### 后续事项

1. 可考虑将 `usePackageCalculator` 增加语义化别名 `useQuoteCalculator`，逐步弱化套餐命名。
2. 可在零售稳定后抽取通用 `QuoteOrderModal`，减少 DIY 整机和零售保存订单弹窗重复。
3. 二手、租赁仍为占位模块，后续需要单独设计业务模型。
4. 可后续处理 `GameCard` 的 `<img>` warning，替换为 Next.js `Image`。

## 技术方案

### 总体策略

产品零售不直接复用整张 `EditablePackageTable`。推荐策略是：

```text
复用底层能力：产品数据、分类数据、产品选择、价格计算、订单保存、报价导出
新建零售表格：负责零售专属的类别选择、自由添加、多行展示和行操作
```

这样可以保持三个场景的边界清晰：

| 场景 | 组件定位 | 主要差异 |
| ---- | -------- | -------- |
| 后台套餐配置 | 套餐管理工具 | 维护套餐模板，关注管理效率 |
| DIY整机 | 整机配置生成器 | 固定装机类别、套餐推荐、测试配置 |
| 产品零售 | 销售明细报价工具 | 默认空白行、动态分类、任意多条商品 |

第一版不抽象大型通用表格。等产品零售跑通后，如果 DIY 和零售重复逻辑明显，再考虑抽出 `QuoteLineTable` 或 `QuoteOrderForm` 这类更稳定的通用组件。

### 1. 导航改造

涉及文件：

- `app/_components/SiteHeader.tsx`

改造点：

1. 从导航配置中移除 `价格方案`。
2. 将原 `装机配置` 文案改为 `DIY整机`，路径保持 `/`。
3. 为 `DIY整机` 增加 hover 下拉，下拉项只包含 `游戏榜单`。
4. 新增平级导航项：
    - `产品零售` -> `/retail`
    - `二手` -> `/second-hand`
    - `租赁` -> `/rental`
5. 保留现有登录、退出、主题切换、时间展示逻辑。

实现建议：

- 继续使用 Ant Design `Dropdown` 做 hover 下拉，和当前用户菜单保持一致。
- `DIY整机` 的 active 状态应覆盖 `/` 和 `/gamesList` 两个场景：
    - 当前路径为 `/` 时，`DIY整机` 激活。
    - 当前路径为 `/gamesList` 时，`DIY整机` 也可以保持激活，表示处于该业务分组下。
- `产品零售`、`二手`、`租赁` 使用现有导航链接样式。

### 2. 产品零售页面

已新增文件：

```text
app/retail/page.tsx
app/retail/_components/RetailQuote/index.tsx
app/retail/_components/RetailQuote/components/RetailToolbar.tsx
app/retail/_components/RetailQuote/components/RetailQuoteTable.tsx
app/retail/_components/RetailQuote/components/RetailOrderModal.tsx
app/retail/_components/RetailQuote/hooks/useRetailTableControl.ts
```

实际实现采用独立组件和 hook，避免继续膨胀 `PCPartsTable/Content`。

职责划分：

| 文件 | 职责 |
| ---- | ---- |
| `page.tsx` | 路由入口，只负责渲染页面容器和 `RetailQuote` |
| `RetailQuote/index.tsx` | 零售报价主组件，组织数据、价格、导出、保存订单 |
| `RetailToolbar.tsx` | 添加一行、重置等顶部操作 |
| `RetailQuoteTable.tsx` | 零售明细表，负责类别、产品、数量、单价、小计、删除 |
| `RetailOrderModal.tsx` | 保存订单弹窗，字段与 DIY 整机保持一致 |
| `useRetailTableControl.ts` | 明细行增删改查、清空、有效行判断 |

本次没有把 `PCPartsTable/Content` 中的保存订单弹窗强行抽出来给两个页面共用。零售页先用同一套字段和同一个 `saveOrder` 服务实现本地弹窗；等 DIY 和零售都稳定后，再抽 `QuoteOrderModal` 和 `useQuoteOrderSubmit`，避免第一次改造同时影响首页核心配置单。

零售表格数据可以继续沿用 `EditablePartRow`：

```ts
interface EditablePartRow {
    id: string;
    category: string;
    product_id: number;
    quantity: number;
    custom_name?: string;
    custom_price?: number;
}
```

零售初始化状态默认包含一条空白行：

```ts
const initRetailData: EditablePartRow[] = [
    { id: createRetailRowId(), category: '', product_id: 0, quantity: 1 },
];
```

添加商品逻辑：

```text
点击添加一行
-> 插入 { id, category: '', product_id: 0, quantity: 1 }
-> 行内选择 category
-> 行内选择 product
```

行更新规则：

1. 修改产品时，只更新当前行 `product_id`。
2. 修改类别时，必须同步清空当前行 `product_id`、`custom_name`、`custom_price`，避免类别与产品不一致。
3. 删除最后一行后自动回到一条空白行，保持销售明细单始终可直接编辑。
4. 有效行判断以 `product_id > 0` 为准，零售订单第一版只保存产品库中的真实商品，避免订单明细外键和后续库存绑定出现不一致。
5. `id` 只作为前端行标识，可以使用 `retail-${Date.now()}-${index}` 或 `crypto.randomUUID()`，不参与后端保存。

和 DIY 整机的差异：

| 能力 | DIY整机 | 产品零售 |
| ---- | ------- | -------- |
| 初始行 | 按整机类别固定生成 | 默认一条空白行 |
| 添加方式 | 在已有类别下添加 | 直接添加空白行，行内选择类别和产品 |
| 多行限制 | 只有部分分类允许多行 | 任意分类都允许多行 |
| 套餐推荐 | 保留 | 不展示 |
| 测试配置 | 保留 | 第一版不需要 |
| 保存订单 | 保留 | 复用 |
| 导出报价单 | 保留 | 复用 |

### 3. 分类来源

产品零售优先使用后台动态产品分类：

- 服务：`app/services/categories.ts`
- 接口：`GET /api/product-categories`

推荐规则：

1. 前台类别选择器读取启用状态的产品分类。
2. 产品选择器按 `product.category` 过滤。
3. 若动态分类加载失败，可展示错误提示和重试，不建议静默回退到旧固定分类，避免用户看到后台已停用或不存在的类别。

当前 `EditablePackageTable` 仍依赖固定 `PACKAGE_CATEGORIES` 渲染整机配置顺序。产品零售第一版建议新增专用表格组件，避免为了零售场景强行改动整机配置表格。

产品和分类的匹配规则建议：

1. 优先按 `Product.category_id` 与动态分类 `ProductCategory.id` 匹配。
2. 如果历史数据缺少 `category_id`，再按 `Product.category` 与分类 `code` 或旧固定分类 key 兜底。
3. UI 展示优先使用 `ProductCategory.label`，其次使用 `ProductCategory.name`。
4. 明细保存时 `product_category` 第一版仍传稳定字符串，优先传产品自身 `category`，没有产品时传所选分类的 `code` 或 `name`。

### 4. 价格计算

产品零售可以复用现有计算能力：

- `usePackageTableData`
- `usePackageCalculator`

注意事项：

- 如果继续复用 `usePackageCalculator`，需要确认它对任意分类、多条行、空数组都能正常工作。
- 零售第一版不开放自定义商品录入；报价和订单都以产品库商品为准。
- 合计金额、优惠后价格、导出报价单的数据结构尽量与当前 `Content` 保持一致。

命名处理建议：

- 第一版可以继续从现有路径导入 `usePackageCalculator`，只要不改它的行为。
- 如果后续重命名，建议新增 `useQuoteCalculator` 作为同一实现的语义化导出，再逐步替换旧引用，避免一次性移动导致后台套餐页面回归风险。

### 4.1 产品选择组件复用

`ProductSelect` 原先放在后台套餐表格目录：

```text
app/admin/dashboard/packages/components/EditablePackageTable/components/ProductSelect.tsx
```

本次已采用“提取共享组件”方案：

- 新增 `app/_components/QuoteProductSelect.tsx`。
- 原后台套餐表格路径 `ProductSelect.tsx` 保留 re-export，避免破坏已有引用。
- 零售页直接使用共享 `QuoteProductSelect`。

### 5. 保存订单

产品零售继续调用现有保存订单链路：

- 前端服务：`saveOrder`
- 后端接口：`POST /api/orders`

推荐调整：

- DIY 整机订单继续使用 `source: 'frontend_quote'`。
- 产品零售订单使用 `source: 'frontend_retail'`。

订单明细仍使用现有字段：

```ts
{
    product_id: item.product_id,
    product_name: product?.name || '未知产品',
    product_category: item.category,
    quantity: item.quantity,
    sale_price: metrics.unitSellPrice,
}
```

这样后台订单列表、结算、库存绑定逻辑可以继续沿用。

### 6. 导出报价单

本次复用当前导出按钮交互：

- `app/_components/PCPartsTable/Content/components/ExportButton.tsx`

但需要同步调整 `utils/canvasExport.ts`，让报价单生成器从“固定整机报价单”变成“可配置报价单”。建议扩展 `QuoteExportData`：

```ts
interface QuoteExportData {
    items: EditablePartRow[];
    products: Product[];
    totalPrice: number;
    discountedPrice?: number;
    title?: string;
    subtitle?: string;
    itemOrder?: 'category' | 'input';
    includeCustomItems?: boolean;
    getCategoryLabel?: (category: string) => string;
    getItemMetrics: (...args) => QuoteItemMetrics;
}
```

推荐默认行为：

- DIY 整机：`itemOrder: 'category'`，保持现有按 `PACKAGE_CATEGORIES_LIST` 的展示顺序。
- 产品零售：`itemOrder: 'input'`，按用户添加顺序导出。
- 自定义商品：导出工具保留 `includeCustomItems` 兼容能力，但零售第一版不在 UI 中开放自定义商品录入。

`ExportButton` 建议增加可选文件名前缀：

```ts
interface ExportButtonProps {
    data: QuoteExportData;
    disabled?: boolean;
    filenamePrefix?: string;
}
```

文件名区分业务场景：

- DIY 整机：可以继续使用现有默认文案。
- 产品零售：建议导出标题使用 `产品零售报价单`。

这样导出交互不变，但图片内容和文件名可以按场景区分。

### 7. 组件复用边界

建议明确以下边界，避免实现时把零售做成整机表格的特殊分支：

| 模块 | 零售是否复用 | 处理方式 |
| ---- | ------------ | -------- |
| `EditablePackageTable` | 不直接复用 | 零售新建 `RetailQuoteTable` |
| `ProductRow` | 不直接复用 | 行布局不同，零售单独实现更清楚 |
| `ProductSelect` | 复用 | 推荐提取到共享组件后复用 |
| `usePackageTableData` | 复用 | 拉产品和定价配置 |
| `usePackageCalculator` | 复用 | 第一版保留旧命名，后续可语义化别名 |
| `ExportButton` | 复用并小改 | 增加文件名前缀，底层导出支持标题和排序 |
| `saveOrder` | 复用 | 零售传 `source: 'frontend_retail'` |
| DIY 保存订单弹窗 | 第一版不抽 | 零售本地实现同字段弹窗，后续再统一 |

## 实施步骤

1. 修改 `SiteHeader.tsx`，完成导航结构调整。
2. 新增 `/second-hand` 和 `/rental` TODO 占位页面。
3. 新增 `/retail` 页面和产品零售组件。
4. 实现 `useRetailTableControl`：默认一条空白行、直接添加空白行、删除行、更新行、重置。
5. 为产品零售接入动态产品分类和产品数据。
6. 实现零售表格：类别、产品、数量、单价、小计、删除。
7. 复用价格计算，展示合计和优惠后价格。
8. 提取或临时复用 `ProductSelect`，优先考虑移动到共享组件目录。
9. 复用导出按钮交互，并扩展 `canvasExport` 支持零售标题和输入顺序。
10. 复用保存订单接口，零售本地实现同字段订单弹窗，订单来源传 `frontend_retail`。
11. 补充基础验证：没有已选择产品的有效明细时不可保存订单、不可导出报价单。
12. 运行 `npm run lint` 和必要的页面手测。

## 验收标准

1. 前台导航不再显示 `价格方案`。
2. `DIY整机` 点击后进入 `/`。
3. hover `DIY整机` 时只出现 `游戏榜单`，点击进入 `/gamesList`。
4. 导航中显示 `产品零售`、`二手`、`租赁` 三个平级入口。
5. `/retail` 默认展示一条空白零售明细行。
6. `/retail` 点击 `添加一行` 会新增空白明细行，不需要先在顶部选择类别。
7. `/retail` 可以在行内选择硬件类别，并在选择类别后选择对应产品。
8. `/retail` 任意类别都可以添加多条商品。
9. `/retail` 可以正常选择产品、修改数量、删除行、计算合计。
10. `/retail` 在无有效商品时不能保存订单或导出报价单。
11. `/retail` 保存订单后，后台订单列表能看到对应明细。
12. `/retail` 导出的报价单金额和页面展示一致。
13. `/second-hand` 和 `/rental` 页面可访问，并明确展示建设中状态。

## 后续扩展

### 二手

后续可独立设计二手商品模型：

- 二手来源。
- 成色等级。
- 售后期限。
- 单件成本。
- 检测记录。
- 可售状态。

### 租赁

后续可独立设计租赁模型：

- 租期类型。
- 押金。
- 租金。
- 起租/归还时间。
- 逾期费用。
- 租赁合同或客户确认记录。

### 订单统计

当 `source` 区分为 `frontend_quote` 和 `frontend_retail` 后，后台可以增加不同来源订单的统计视图，用于区分整机销售和零售销售表现。
