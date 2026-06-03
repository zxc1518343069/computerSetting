# 商品条形码字段接入影响分析

## 1. 业务共识

条形码是商品型号维度的信息，序列号是库存单件维度的信息。两者不是同一个东西。

- 商品和条形码：`0 或 1 : 1`。一个商品最多有一个条形码，但商品可以没有条形码，例如散片 CPU。
- 商品和序列号：`1 : N`。一个商品型号下可以有多件库存，每件库存可以有自己的序列号。
- 条形码用于快速定位商品，也可以反查库存，但反查路径是 `barcode -> product -> inventory_items[]`。
- 条形码不能替代序列号。扫码条形码只能找到商品及其库存集合，不能天然锁定某一件库存。

## 2. 字段设计建议

字段应落在 `products` 表，而不是 `inventory_items` 表。

建议字段：

```sql
barcode TEXT
```

约束建议：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode
    ON products (barcode)
    WHERE barcode IS NOT NULL AND barcode <> '';
```

处理规则：

- 前端输入和后端入库时都执行 `trim`。
- 空字符串统一保存为 `null`。
- 条形码必须用字符串保存，不能用数字，避免前导 0 丢失。
- 一旦填写条形码，必须全系统唯一。
- 搜索时建议优先精确匹配 `barcode`，再做商品名称模糊匹配；普通列表搜索也可以支持 `barcode LIKE`。

## 3. 是否需要功能开关

当前不建议做全局开关。

原因：

- 条形码本质是可选字段，不填写不会影响散片 CPU 等无条码商品。
- 功能入口主要是搜索和选择商品，不会改变现有报价、入库、库存、订单的主流程。
- 做全局开关会增加配置、条件渲染和测试成本，但收益有限。

可以保留一个轻量策略：没有条形码的商品展示 `-`，搜索框文案写成“产品名称 / 条形码”。如果未来某些部署完全不想展示条形码，再考虑加配置项。

## 4. 必须修改的位置

### 4.1 数据库和迁移

- `lib/db/schema.sql`
    - 在 `products` 表增加 `barcode` 字段。
    - 增加允许空值的唯一索引。

- `lib/db/index.ts`
    - 在 `runCompatMigrations` 中使用 `ensureColumn` 给老 SQLite 数据库补 `products.barcode`。
    - 老库已有数据没有条形码，因此字段应先允许为空。

- `database/schema.sql`
    - 如果仍保留 Supabase/Postgres 结构，需要同步 `products.barcode`。

- `database/update_products.sql`
    - 增加 Postgres 侧补字段 SQL。
    - 增加允许空值的唯一索引 SQL。

### 4.2 类型和序列化

- `const/types.ts`
    - `Product` 增加 `barcode?: string | null`。

- `lib/db/serializers.ts`
    - `ProductRow` 增加 `barcode?: string | null`。
    - `serializeProduct` 返回 `barcode`。

- `app/admin/dashboard/config/types.ts`
    - 当前从 `@/const` 复用 `Product`，通常不需要额外改，但需要确认类型透传正常。

- `app/admin/dashboard/packages/types.ts`
    - 当前也从 `@/const` 复用 `Product`，通常不需要额外改。

### 4.3 商品 CRUD API

- `app/api/products/route.ts`
    - `GET` 搜索条件从只搜 `name` 扩展为 `name` 或 `barcode`。
    - `POST` 从请求体读取 `barcode`。
    - 新增商品时写入 `barcode`，空字符串转 `null`。
    - 如果出现唯一索引冲突，返回清晰提示，例如“条形码已存在”。

- `app/api/products/[id]/route.ts`
    - `PUT` 从请求体读取 `barcode`。
    - 更新商品时写入 `barcode`，空字符串转 `null`。
    - 如果出现唯一索引冲突，返回清晰提示。

- `app/api/products/import/route.ts`
    - `ImportProduct` 增加 `barcode?: string | null`。
    - 批量导入时写入 `barcode`。
    - 导入时也要处理空字符串和重复条形码。

### 4.4 全量数据交换

- `lib/db/dataExchange.ts`
    - `products` 表的 `columns` 中加入 `barcode`。
    - 影响“下载模板”、“导出数据”、“上传恢复”三个功能。

- `app/api/data-exchange/route.ts`
    - 当前按 `dataExchangeTables` 动态生成 SQL，通常不需要额外改。
    - 需要确认新增列后模板、导出、导入都正常。

## 5. 需要输入条形码的位置

### 5.1 后台商品管理弹窗

- `app/admin/dashboard/config/_components/ProductModal.tsx`
    - 在“产品名称”附近增加“条形码”输入框。
    - 字段非必填。
    - 编辑商品时回填 `product.barcode`。
    - 提交时把 `barcode` 放进 `productData`。
    - 建议提示文案：`可选，盒装商品可填写；散片商品可留空`。

### 5.2 数据导入

- `app/api/products/import/route.ts`
    - 如果继续保留单独产品导入 API，需要支持 `barcode`。

- `app/admin/dashboard/import/*`
    - 当前数据交换页面根据后端模板列导入导出，不需要单独写输入框。
    - 模板中 `产品型号` sheet 应出现 `barcode` 列。

### 5.3 演示和种子数据

- `const/mockData.ts`
    - 演示商品可以补一些示例 `barcode`，也可以留空。

- `scripts/seed-demo-data.ts`
    - `ProductSeed` 可增加 `barcode`。
    - `INSERT INTO products` 增加 `barcode`。

- `scripts/migrate-supabase-to-sqlite.ts`
    - 如果 Supabase 数据里也有 `barcode`，迁移时要同步写入 SQLite。

## 6. 需要展示条形码的位置

### 6.1 商品管理列表

- `app/admin/dashboard/config/_components/ProductTable.tsx`
    - 增加“条形码”列。
    - 没有条形码显示 `-`。
    - 建议列宽 160 到 220，使用等宽字体。

- `app/admin/dashboard/config/page.tsx`
    - 搜索框 placeholder 改为“搜索产品名称 / 条形码”。

### 6.2 销售商品列表

- `app/admin/dashboard/sales/products/page.tsx`
    - 商品列可在名称下方展示条形码，或增加独立“条形码”列。
    - 搜索框 placeholder 改为“搜索产品名称 / 条形码”。
    - 详情弹窗中可加一个 `Tag` 展示条形码。

### 6.3 库存物品列表

- `app/admin/dashboard/warehouse/products/page.tsx`
    - 物品名称列可在商品名下方展示商品条形码。
    - 搜索框 placeholder 改为“搜索物品、条形码、商家、序列号”。
    - 注意这里同时有 `product.barcode` 和 `inventory_item.serial_number`，界面文案要区分清楚。

### 6.4 入库单详情

- `app/admin/dashboard/warehouse/inbound/page.tsx`
    - 入库明细只读区域可以在商品名下方展示条形码。
    - 新增入库单选择商品时，商品下拉应支持展示或搜索条形码。

### 6.5 套餐和前台报价选择

- `app/admin/dashboard/packages/components/EditablePackageTable/components/ProductRow.tsx`
    - 下拉 options 需要携带 `barcode`。

- `app/admin/dashboard/packages/components/EditablePackageTable/components/ProductSelect.tsx`
    - 搜索过滤支持 `label` 和 `barcode`。
    - 下拉展示可以在商品名称下方用小字显示条形码。

这部分不是价格计算必需，但能让“扫码快速选商品”在报价和套餐场景也可用。

## 7. 需要支持条形码搜索或反查库存的位置

### 7.1 商品列表 API

- `app/api/products/route.ts`
    - `search` 支持 `name LIKE @search OR barcode LIKE @search`。
    - 如果是扫码场景，可以优先精确匹配 `barcode = @barcode`。

### 7.2 销售商品 API

- `app/api/sales-products/route.ts`
    - `search` 支持 `name` 和 `barcode`。
    - 扫条形码后返回对应商品的库存汇总和 `inventory_items`。

### 7.3 库存物品 API

- `app/api/inventory-items/route.ts`
    - 搜索条件从 `p.name OR s.name OR ii.serial_number` 扩展为 `p.name OR p.barcode OR s.name OR ii.serial_number`。
    - 这样扫商品条形码可以直接列出该商品下所有库存单件。

### 7.4 入库商品选择

- `app/admin/dashboard/warehouse/inbound/page.tsx`
    - `productOptions` 的 label/filter 支持条形码。
    - 扫码输入后快速定位商品，再继续填写数量、成本和序列号。

## 8. 需要注意的序列化补点

有些接口虽然能 `SELECT * FROM products`，但手工拼装 `serializeProduct` 入参时会漏字段。加 `barcode` 后需要逐个确认：

- `app/api/inbound-orders/route.ts`
    - 当前显式选择了 `p.category, p.name, p.price_cents...`，需要把 `p.barcode` 加进 SELECT。
    - 手工传给 `serializeProduct` 的对象也要包含 `barcode`。

- `app/api/packages/route.ts`
    - `SELECT pi.*, p.*` 已能拿到 `barcode`，但手工传给 `serializeProduct` 的对象要包含 `barcode`。

- `app/api/orders/route.ts`
    - 当前 `productStmt` 是 `SELECT * FROM products WHERE id = ?`，类型和 `serializeProduct` 更新后通常可自动带出。

- `app/api/inventory-items/route.ts`
    - 当前商品 map 使用 `SELECT * FROM products`，类型和 `serializeProduct` 更新后通常可自动带出。

## 9. 建议实施顺序

1. 先改数据库结构、兼容迁移、类型和 `serializeProduct`。
2. 再改商品 CRUD API，确保新增、编辑、列表都能保存和返回 `barcode`。
3. 改商品管理弹窗和表格，完成最小可用输入和展示。
4. 改搜索相关 API，让条形码能查商品、销售商品和库存物品。
5. 改入库、销售、库存、套餐下拉的展示和搜索体验。
6. 改数据交换、导入、演示数据、迁移脚本。
7. 最后跑 `npm run lint` 和 `npm run build`，再用浏览器验证商品新增、编辑、扫码搜索、库存反查。

## 10. 验证场景

- 新增盒装 CPU，填写条形码，保存后列表展示条形码。
- 新增散片 CPU，不填写条形码，保存后列表展示 `-`。
- 两个商品填写相同条形码，应提示重复。
- 商品管理页搜索条形码，应定位到对应商品。
- 销售商品页搜索条形码，应展示该商品库存汇总。
- 库存物品页搜索条形码，应展示该商品下所有库存单件。
- 入库时在商品下拉中输入或扫码条形码，应选中对应商品。
- 序列号搜索仍然只定位库存单件，不受条形码影响。
- 数据交换导出的 `产品型号` sheet 包含 `barcode`，导入后字段不丢失。

## 11. 执行补充

实际执行时，当前工作区的 `database/` 目录为空，未发现可编辑的 Postgres schema 或更新脚本。因此本次落地只修改了真实存在的 SQLite schema 和兼容迁移：

- `lib/db/schema.sql`
- `lib/db/index.ts`

另外，当前 `next.config.ts` 原本会把 `/admin/dashboard/config` 重定向到 `/admin/dashboard/warehouse/products`，导致商品基础档案页不可达。为了让条形码拥有真实的手动录入和编辑入口，本次执行中已：

- 移除 `/admin/dashboard/config` 的重定向。
- 在后台“仓库管理”菜单中新增“产品型号”入口，指向 `/admin/dashboard/config`。
