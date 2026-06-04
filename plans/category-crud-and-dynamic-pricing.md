# 商品类目 CRUD 与动态溢价方案

## 背景

当前系统的商品分类仍然以静态常量维护，主要集中在 `const/categories.ts`。这些分类被产品管理、库存筛选、销售列表、套餐配置、前台报价单、Excel 数据交换和溢价配置共同使用。

现有溢价配置也与固定分类强绑定，`PricingConfig` 中直接包含 `cpu`、`gpu`、`motherboard` 等字段。这样当业务扩展到鼠标、鼠标垫、摄像头、键盘、耳机、线材等周边类目时，新增类目无法自动拥有独立溢价配置，需要改代码和数据库字段。

目标是把“硬件类型”升级为更通用的“商品类目 / 配件类型”，并让类目和溢价都支持动态管理。

本方案不重构首页整机装机配置。当前首页装机配置和后台套餐配置仍按现有写死结构运行；“可扩展装机配置表 / 周边商品追加项”属于另一个大功能，不放在本方案内。

## 目标

1. 商品类目可以在后台进行新增、编辑、停用、排序和必要条件下删除。
2. 新增商品类目后，产品新增/编辑、产品筛选、库存筛选、销售筛选可以立即使用。
3. 溢价配置改为动态结构，支持在溢价页新增、编辑、删除类目溢价规则。
4. 类目主关联从字符串 `key` 调整为数据库 `id`。
5. 不改造首页装机配置和后台套餐配置的固定结构。
6. 保证已有产品、库存、套餐、销售订单历史展示不被破坏。
7. 数据导入导出首期同步支持商品类目和动态溢价规则。

## 不纳入范围

以下内容不在本次方案内：

- 首页整机装机配置动态化。
- 后台套餐配置动态化。
- 按类目动态生成报价/套餐行。
- 周边商品追加项或可选项配置。
- 多选类目、必选类目、装机配置模板等规则设计。

## 术语调整

建议逐步把页面文案从“硬件类型”调整为：

- 后台配置：商品类目
- 产品表单：商品类目
- 报价/套餐表：配件类型
- 溢价页：分类溢价

这样可以覆盖 CPU、显卡、主板，也可以覆盖鼠标、鼠标垫、摄像头等周边商品。

## 数据模型建议

### 商品类目表

新增 `product_categories` 表：

```sql
CREATE TABLE IF NOT EXISTS product_categories
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    tag_color TEXT NOT NULL DEFAULT 'blue',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

字段说明：

| 字段 | 含义 |
| --- | --- |
| `id` | 类目主标识，产品和溢价都通过它关联 |
| `code` | 系统内部自动生成的兼容编码，如 `cpu`、`gpu`、`mouse`、`mousepad`；不作为业务主键，不在表单中让用户填写 |
| `name` | 短展示名，如 `处理器`、`鼠标` |
| `label` | 完整展示名，如 `CPU(处理器)` |
| `tag_color` | 类目 Tag 颜色，存语义色值，如 `blue`、`green`、`purple` |
| `sort_order` | 排序 |
| `is_active` | 是否启用，停用后新增产品不可选 |

图标不进入本次设计。类目展示以文字和 Tag 颜色为主，减少维护成本。

`tag_color` 使用受控色板，不直接存 Tailwind class。新增类目时系统自动从色板中选择当前使用次数较少的颜色，尽量避免相邻或常用类目颜色重复；不做唯一约束，因为类目数量可能超过色板数量。用户可以在类目管理中手动调整颜色。

### 产品表关联调整

第一阶段建议为 `products` 增加 `category_id`：

```sql
ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES product_categories(id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
```

迁移时根据当前 `products.category` 字符串匹配 `product_categories.code` 并回填 `category_id`。后续新代码优先使用 `category_id`，原 `category` 字段先保留用于兼容旧页面、旧导入导出和历史逻辑。

产品 API 过渡期同时返回新旧字段：

```ts
interface Product {
    id: number;
    category_id?: number | null;
    category: string; // 旧字段，兼容历史逻辑
    category_name?: string;
    category_label?: string;
    name: string;
    price: number;
}
```

新增和编辑产品时，前端提交 `category_id`。服务端可以根据 `category_id` 回填旧 `category` 字段为对应类目的 `code`，用于兼容仍未改造的页面。

### 动态溢价表

保留 `pricing_config` 的全局字段，新增 `category_pricing_rates`：

```sql
CREATE TABLE IF NOT EXISTS category_pricing_rates
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL UNIQUE REFERENCES product_categories(id),
    rate REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

溢价规则与类目通过 `category_id` 关联。某个类目没有专属溢价规则时，分类溢价模式下默认按 `0%` 处理。

## 溢价配置结构

当前结构：

```ts
interface PricingConfig {
    unifiedPricing: boolean;
    unifiedRate: number;
    roundingType: 'none' | 'integer' | 'ten';
    cpu: number;
    motherboard: number;
    gpu: number;
    // ...
}
```

建议改为：

```ts
interface PricingConfig {
    id?: number;
    unifiedPricing: boolean;
    unifiedRate: number;
    roundingType: 'none' | 'integer' | 'ten';
    categoryRates: Record<number, number>;
}
```

API 返回给溢价页时可以额外带上类目信息，方便直接渲染：

```ts
interface PricingConfigResponse {
    id?: number;
    unifiedPricing: boolean;
    unifiedRate: number;
    roundingType: 'none' | 'integer' | 'ten';
    rates: Array<{
        id: number;
        categoryId: number;
        categoryCode?: string | null;
        categoryName: string;
        categoryLabel: string;
        tagColor: string;
        sortOrder: number;
        isActive: boolean;
        rate: number;
    }>;
}
```

计算器内部使用 `categoryRates`：

```ts
getPricingRate(categoryId?: number): number {
    if (!this.config) return 1;

    if (this.config.unifiedPricing) {
        return 1 + (this.config.unifiedRate || 0) / 100;
    }

    return 1 + (this.config.categoryRates?.[categoryId || 0] || 0) / 100;
}
```

## CRUD 规则

### 新增类目

新增类目时：

1. 用户只填写类目名称、展示标签、状态、排序和可选 Tag 颜色。
2. 系统自动生成 `code`，并保证唯一。
3. 如果用户未选择颜色，系统从受控色板中自动分配一个尽量不重复的颜色。
4. 创建 `product_categories` 记录。
5. 不强制自动创建溢价规则；溢价页可以按需为该类目新增专属溢价。

### 编辑类目

允许编辑：

- `name`
- `label`
- `tag_color`
- `sort_order`
- `is_active`

类目主关联使用 `id`，所以 `code` 不承担主键职责。`code` 不在页面中开放编辑，仅作为系统生成的兼容字段。

### 删除类目

建议优先做停用，不做物理删除。

硬删除只在以下条件全部满足时允许：

1. 该类目下没有产品。
2. 没有库存、采购、销售相关数据间接引用该类目的产品。
3. 没有其他业务数据引用该类目。

如果有产品或业务引用，接口返回业务错误，提示使用“停用”。

如果类目没有产品和业务引用，但存在溢价规则，可以删除类目时一并删除对应溢价规则。

### 停用类目

停用后的行为：

1. 新增产品时不再可选。
2. 已有产品仍然显示原类目名称。
3. 库存、订单、套餐历史仍可正常展示。
4. 溢价记录保留。
5. 可以选择是否在溢价页显示停用类目，建议默认折叠或加“显示停用类目”开关。

## 页面设计

### 商品类目管理入口

推荐放在：

```text
/admin/dashboard/config/categories
```

或者将现有配置中心改为 Tabs：

```text
配置中心
- 产品型号
- 商品类目
```

首期推荐新建独立页面，改动边界更清楚。

### 类目列表

表格字段：

- 排序
- 类目标识
- 类目名称
- 展示标签
- Tag 颜色
- 是否启用
- 产品数量
- 溢价率
- 操作

操作：

- 新增
- 编辑
- 停用/启用
- 删除，只有无引用时可用
- 调整排序

### 溢价配置页

现有溢价页需要从静态 `PACKAGE_CATEGORIES_LIST` 改为接口返回。

溢价页需要支持类目溢价规则的新增、编辑和删除。

建议职责划分：

1. 类目本身的新增、删除、排序在“商品类目管理”里完成。
2. 溢价页可以新增一条溢价规则：选择类目，设置比例。
3. 已有溢价规则可以直接编辑比例。
4. 删除溢价规则只代表该类目不再使用专属溢价，类目本身不受影响。
5. 溢价页可以提供“管理商品类目”的跳转按钮。

新增溢价规则时：

1. 类目下拉只展示启用中、且还没有溢价规则的类目。
2. 已停用类目默认不展示。
3. 如后续需要，可以增加“显示停用类目”的开关。
4. 同一个类目只能存在一条溢价规则。

统一溢价与分类溢价的关系：

1. 开启统一溢价时，所有分类溢价规则暂时不生效。
2. 分类溢价规则数据保留。
3. 切回分类溢价时，原来的分类规则继续生效。
4. 没有溢价规则的类目按 `0%` 处理。

分品类模式下，渲染接口返回的 `rates` 列表：

```ts
rates.map((item) => (
    // 渲染 item.categoryName + item.rate
));
```

## API 设计

### 商品类目

```text
GET    /api/product-categories
POST   /api/product-categories
GET    /api/product-categories/:id
PUT    /api/product-categories/:id
DELETE /api/product-categories/:id
```

查询参数建议：

```text
includeInactive=true
builderOnly=true
```

### 溢价配置

保留：

```text
GET  /api/pricing
POST /api/pricing
```

`GET /api/pricing` 返回动态结构。

`POST /api/pricing` 接收：

```ts
{
    unifiedPricing: boolean;
    unifiedRate: number;
    roundingType: 'none' | 'integer' | 'ten';
    categoryRates: Record<number, number>;
}
```

保存时：

1. 更新 `pricing_config` 的全局字段。
2. 批量 upsert `category_pricing_rates`。
3. 未提交但已存在的类目 rate 可保留原值。
4. 没有溢价规则的类目按 `0%` 处理。

为溢价页的“新增溢价”交互，也可以补充独立规则接口：

```text
POST   /api/pricing/rates
PUT    /api/pricing/rates/:id
DELETE /api/pricing/rates/:id
```

新增规则时需要校验同一个 `category_id` 不能重复配置。

## 前端数据访问

新增统一 hook：

```ts
useProductCategories(options?: {
    includeInactive?: boolean;
    builderOnly?: boolean;
})
```

返回：

```ts
{
    categories,
    categoryOptions,
    categoryMap,
    loading,
    refresh,
}
```

逐步替代：

- `CATEGORY_CONFIG`
- `PACKAGE_CATEGORIES_LIST`
- `PACKAGE_CATEGORIES`
- `categoryOptions`
- `categoryNameMap`
- `categoryDisplayMap`
- `categoryColorMap`

第一阶段可以保留静态常量作为 fallback，避免接口失败时页面完全不可用。

## 需要改造的关键模块

### 产品配置中心

文件包括：

- `app/admin/dashboard/config/page.tsx`
- `app/admin/dashboard/config/_components/ProductModal.tsx`
- `app/admin/dashboard/config/_components/ProductTable.tsx`

改造点：

1. 类型筛选从接口类目读取。
2. 产品弹窗的类目下拉从接口类目读取。
3. 表格展示通过 `categoryMap` 获取名称和 Tag 颜色。

### 销售与库存页面

涉及：

- `app/admin/dashboard/sales/products/page.tsx`
- `app/admin/dashboard/warehouse/products/page.tsx`
- 采购、入库、订单中展示 `categoryNameMap` 的页面

改造点：

1. 筛选项动态读取类目。
2. 展示名称通过 `categoryMap` 获取。
3. 找不到类目时 fallback 到原始 `category` 字符串。

### 首页装机配置与后台套餐配置

涉及：

- `app/admin/dashboard/packages/components/PackageModal.tsx`
- `app/admin/dashboard/packages/components/EditablePackageTable/EditablePackageTable.tsx`
- `app/_components/PCPartsTable/Content/hooks/useTableControl.ts`
- `app/_components/PCPartsTable/Content/index.tsx`

本方案不改造这些模块。

当前首页装机配置和后台套餐配置仍是写死的整机结构。商品类目 CRUD 与动态溢价先服务于产品管理、库存/销售筛选、销售定价和数据导入导出。

### 定价计算

涉及：

- `utils/pricing.ts`
- `app/api/pricing/route.ts`
- `app/api/sales-products/route.ts`
- `app/api/orders/[id]/config-adjustment/route.ts`
- `app/admin/dashboard/config/hooks/usePricing.ts`
- `app/admin/dashboard/pricing/page.tsx`

改造点：

1. `PricingConfig` 改成动态结构。
2. API 读取 `category_pricing_rates`。
3. 计算器按 `categoryRates[categoryId]` 取溢价。
4. 定价页按接口返回的 rates 动态渲染。

### 数据交换

涉及：

- `lib/db/dataExchange.ts`
- `app/api/data-exchange/route.ts`

改造点：

1. 导入导出加入 `product_categories`。
2. 导入导出加入 `category_pricing_rates`。
3. 兼容旧 Excel 备份中只有 `pricing_config` 固定字段的情况。
4. 兼容旧 Excel 备份中没有 `product_categories` 的情况。
5. 恢复数据后补齐缺失的默认类目。
6. 旧文件只有 `products.category` 时，导入后自动创建或匹配类目，并回填 `products.category_id`。

## 数据迁移策略

新增迁移：

1. 创建 `product_categories` 表。
2. 创建 `category_pricing_rates` 表。
3. 将当前 `const/categories.ts` 中的默认类目插入 `product_categories`。
4. 为 `products` 添加 `category_id` 并按旧 `products.category` 回填。
5. 将当前 `pricing_config` 中的固定 rate 字段迁移到 `category_pricing_rates`，并通过类目 `id` 关联。
6. 对已存在但没有类目配置的 `products.category`，自动补一条类目记录，名称先使用原始值。

旧字段处理：

第一阶段保留 `pricing_config` 里的 `cpu_rate` 等字段，避免一次性破坏数据交换和旧代码。

第二阶段等所有调用都切到动态结构后，再考虑清理旧字段。SQLite 删除字段成本较高，可以长期保留但不再使用。

## 兼容与兜底

1. `products.category_id` 作为新主关联，`products.category` 暂时保留做兼容。
2. 历史订单中的 `product_category` 继续保留快照，不强制外键关联。
3. 分类展示找不到配置时，显示旧 `category` 字符串或原始值。
4. 溢价找不到类目 rate 时按 `0%` 处理。
5. 测试数据历史迁移不作为强约束，必要时允许通过重新导入或重建测试数据修正。

## 推荐实施阶段

### 阶段一：数据层与 API

- 新增类目表和动态溢价表。
- 为产品表增加 `category_id` 并回填历史数据。
- 增加迁移脚本。
- 实现 `/api/product-categories`。
- 改造 `/api/pricing` 支持动态 rates。
- 实现溢价规则新增、编辑、删除能力。
- 产品 API 同时返回 `category_id`、旧 `category` 和类目展示字段。
- 数据导入导出加入类目与溢价规则，并兼容旧 Excel。
- 保留旧 pricing 字段兼容。

### 阶段二：后台管理页

- 新建商品类目管理页面。
- 接入新增、编辑、启用/停用、删除校验。
- 后台菜单增加入口。

### 阶段三：产品与筛选动态化

- 产品新增/编辑接入动态类目。
- 产品列表、销售列表、库存列表接入动态筛选和展示。

### 阶段四：清理

- 逐步减少静态分类常量的直接使用。
- 评估是否清理旧 pricing 固定字段。
- 评估是否继续保留 `products.category` 旧字段。

## 待讨论问题

以下决策已确认：

- 产品接口过渡期同时返回 `category_id`、旧 `category` 和类目展示字段。
- 有产品或业务引用的类目不能硬删除，只能停用。
- 新增溢价规则时，只能选择启用中且尚未配置溢价的类目。
- 没有溢价规则的类目按 `0%` 处理。
- 统一溢价开启时分类规则不生效但保留，切回分类溢价后继续生效。
- 类目 `code` 不让用户填写，由系统自动生成。
- 类目不维护图标，只维护存库的 Tag 颜色。
- Tag 颜色使用语义色值，由系统从受控色板中尽量分散分配，允许用户手动调整。
- 历史订单数据第一阶段不做强迁移。
- 数据导入导出首期纳入动态类目和溢价规则。
