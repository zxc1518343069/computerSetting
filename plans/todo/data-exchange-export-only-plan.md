# 数据交换页导出功能收敛方案

## 1. 背景

当前 `/admin/dashboard/data/exchange` 只是复用旧的导入页面：

- `app/admin/dashboard/data/exchange/page.tsx` 渲染 `app/admin/dashboard/import/page.tsx`。
- 页面同时提供“下载模板”“导出数据”“上传数据”。
- 导出 Excel 的表头直接使用数据库字段名，例如 `id`、`created_at`、`price_cents`。
- 后端数据表配置集中在 `lib/db/dataExchange.ts`，接口为 `GET /api/data-exchange?mode=export|template`。

本次目标是将“数据交换”入口收敛为只负责数据导出，并让导出结果更适合业务人员阅读。

## 2. 目标

1. `/admin/dashboard/data/exchange` 只保留“导出数据”能力。
2. 删除数据交换模块中的“下载模板”和“上传数据”能力。
3. 导出前支持选择要导出的工作表。
4. 导出的 Excel 只包含被选中的工作表。
5. Excel 表头使用中文业务名称，不再直接暴露英文数据库字段名。
6. 尽量复用现有数据交换配置和导出链路，降低回归风险。

## 3. 非目标

1. 本次不做字段级选择，只做工作表级选择。
2. 本次不做金额单位转换、状态枚举中文化等数据值格式化。
3. 本次不调整权限模型，继续沿用当前后台访问控制。

## 4. 现状关键文件

- `app/admin/dashboard/data/exchange/page.tsx`：数据交换路由入口，目前直接复用导入页。
- `app/admin/dashboard/import/page.tsx`：旧数据导入/导出页面，本次应删除、重定向或改为不可达。
- `app/admin/dashboard/import/hooks/useImport.ts`：旧下载模板、导出、上传数据逻辑，本次只保留可复用的导出部分。
- `app/admin/dashboard/import/services.ts`：旧前端数据交换接口定义，本次移除模板和导入接口调用。
- `app/admin/dashboard/import/utils.ts`：旧 Excel 生成与解析工具，本次只保留导出生成能力。
- `app/api/data-exchange/route.ts`：数据交换 API。
- `lib/db/dataExchange.ts`：导出/导入表配置。

## 5. 推荐实现方案

### 5.1 新增独立数据导出页

将 `app/admin/dashboard/data/exchange/page.tsx` 从转发旧 `ImportPage` 改为独立客户端页面。

页面结构建议：

- 页面标题：`数据导出中心`
- 辅助说明：说明用于导出 SQLite 业务数据备份或分析文件。
- 工作表选择区：展示可导出的业务工作表。
- 快捷操作：`全选`、`清空`。
- 主按钮：`导出数据` 或 `导出 N 个工作表`。

页面不再展示：

- 下载模板卡片。
- 上传数据卡片。
- 恢复数据风险提示。
- 导入流程操作指南。

### 5.2 增加工作表选择数据源

前端需要知道所有可导出的工作表。可选方案：

#### 方案 A：复用导出接口返回的表配置

新增接口参数：

```text
GET /api/data-exchange?mode=export&includeRows=false
```

返回所有工作表元信息，但不返回数据行。页面初始化时加载该列表。

优点：前端不需要维护表配置副本。

#### 方案 B：新增轻量接口

新增接口：

```text
GET /api/data-exchange/tables
```

返回：

```ts
{
    tables: Array<{
        table: string;
        sheet: string;
        columns: string[];
        columnLabels: Record<string, string>;
    }>;
}
```

优点：语义更清晰；缺点：多一个 API 文件。

#### 推荐

第一阶段推荐方案 A，在现有接口上扩展，改动更少。

### 5.3 后端导出接口支持筛选工作表

扩展现有接口：

```text
GET /api/data-exchange?mode=export&tables=products,inventory_items,sales_orders
```

处理规则：

1. `tables` 为空时默认导出全部工作表，保持向后兼容。
2. `tables` 非空时通过统一的 `tableMap` 映射解析，不在页面、接口和工具函数里维护第二套表名。
3. 前端选择项也由同一份表配置生成：用户看到中文 `sheet`，请求传递稳定的英文 `table` key。
4. SQL 查询仍只使用配置内的表名和字段名，不拼接用户传入的任意字段。

示例实现思路：

```ts
const tableMap = new Map(dataExchangeTables.map((table) => [table.table, table]));

const selectedTableNames = searchParams
    .get('tables')
    ?.split(',')
    .map((name) => name.trim())
    .filter(Boolean);

const tables = selectedTableNames?.length
    ? selectedTableNames.map((tableName) => tableMap.get(tableName)).filter(Boolean)
    : dataExchangeTables;
```

实现时可加一个映射校验：如果请求中出现 `tableMap` 找不到的 key，直接返回错误；正常页面操作不会产生非法 key，这个校验只是兜住手写 URL、缓存或后续脚本调用。

### 5.4 保留字段数组，新增中文表头映射

当前配置：

```ts
columns: ['id', 'name', 'created_at'];
```

本次以模块删减和低影响改造为主，不建议把 `columns` 从字符串数组升级为对象数组。推荐保留现有 `columns: string[]`，只额外增加中文表头映射。导出的表头一律来自该映射：

```ts
columns: ['id', 'name', 'created_at'],
columnLabels: {
    id: 'ID',
    name: '名称',
    created_at: '创建时间',
}
```

对应类型：

```ts
export interface DataExchangeTable {
    table: string;
    sheet: string;
    columns: string[];
    columnLabels: Record<string, string>;
}
```

这样可以最大化复用现有导出链路：

- SQL 查询字段：继续使用 `columns`。
- Excel 数据取值：继续使用 `columns`。
- Excel 表头展示：使用 `columnLabels[column]`。
- 页面工作表说明：使用 `sheet`。

实现时应增加映射完整性校验，保证每个 `columns` 中的字段都有对应的 `columnLabels`。如果缺失中文表头，应在开发阶段或接口生成阶段直接报错，而不是回退导出英文字段名。

### 5.5 Excel 生成使用中文表头

当前前端生成逻辑使用 `sheet.columns` 作为第一行，因此会导出英文表头。

需要调整为：

```ts
const headers = sheet.columns.map((column) => sheet.columnLabels[column]);
const rows = sheet.rows.map((row) => sheet.columns.map((column) => row[column] ?? ''));
const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
```

列宽也基于中文表头计算：

```ts
worksheet['!cols'] = sheet.columns.map((column) => ({
    wch: Math.max(sheet.columnLabels[column].length + 4, 14),
}));
```

### 5.6 下线导入和模板能力

本次不是隐藏入口后继续保留导入能力，而是让数据交换模块只承担导出职责。

前端处理：

- `app/admin/dashboard/data/exchange/page.tsx` 改为独立导出页。
- 页面不再引入旧 `ImportPage`。
- 删除或不再使用 `handleDownloadTemplate`、`handleUpload`、`parseDataExchangeFile`、`importDataExchangeWorkbook`。
- 如果 `/admin/dashboard/import` 仍存在，建议改为重定向到 `/admin/dashboard/data/exchange`，或删除该路由，避免产生第二个入口。

API 处理：

- `GET /api/data-exchange?mode=template` 不再作为业务能力暴露；可返回 400，或删除 `template` 分支。
- `POST /api/data-exchange` 不再提供恢复导入；可删除该 handler，或保留为 405/410 响应。
- `GET /api/data-exchange?mode=export` 保留，并新增工作表选择和中文表头返回。

## 6. 前端交互细节

建议使用 Ant Design 组件保持后台页面一致性：

- `Checkbox.Group`：工作表多选。
- `Button`：导出、全选、清空。
- `Spin`：加载工作表配置或导出中状态。
- `Empty`：无可导出工作表时展示空状态。
- `message`：导出成功/失败反馈。

默认行为：

1. 页面加载后默认选中全部工作表。
2. 用户清空选择后，导出按钮禁用。
3. 导出中禁用选择区和操作按钮。
4. 导出文件名继续使用 `computer-data-export-YYYYMMDD_HHmmss.xlsx`。

## 7. 中文字段名建议

第一阶段字段命名以“准确直译 + 后台可理解”为原则，不做过度业务美化。

通用字段：

| 字段       | 中文表头 |
| ---------- | -------- |
| id         | ID       |
| created_at | 创建时间 |
| updated_at | 更新时间 |
| note       | 备注     |
| status     | 状态     |
| name       | 名称     |
| type       | 类型     |

金额字段：

| 字段后缀 | 中文表头建议                  |
| -------- | ----------------------------- |
| `_cents` | 保留“分”字样，例如 `金额(分)` |

说明：本次不转换金额单位，所以表头应明确为“分”，避免误解为“元”。

## 8. 实施步骤

1. 在 `lib/db/dataExchange.ts` 保留 `columns: string[]`，新增 `columnLabels`，补齐所有字段中文表头。
2. 基于 `dataExchangeTables` 建立统一 `tableMap`，前端选项、接口筛选和导出查询都通过这份映射工作。
3. 修改 `app/api/data-exchange/route.ts`，返回 `columnLabels`，并支持 `tables` 参数按 `tableMap` 筛选。
4. 增加映射完整性校验：每个 `columns` 字段必须存在中文 `columnLabels`，缺失时直接报错。
5. 修改前端 `DataExchangeWorkbook` / `DataExchangeSheet` 类型，支持 `columnLabels: Record<string, string>`。
6. 修改 Excel 下载工具，使用 `columnLabels[column]` 作为表头，数据取值仍使用 `row[column]`，不回退导出英文字段名。
7. 将 `app/admin/dashboard/data/exchange/page.tsx` 改为独立导出页面。
8. 为导出页新增必要 hook 或工具函数，例如 `useDataExport`。
9. 下线旧导入页面入口：删除 `/admin/dashboard/import`，或将其重定向到 `/admin/dashboard/data/exchange`。
10. 下线模板和导入 API：移除 `mode=template` 能力，并让 `POST /api/data-exchange` 不再可用。
11. 运行 lint/build，手动验证导出文件。

## 9. 验收标准

1. 访问 `/admin/dashboard/data/exchange`，页面只出现导出相关功能。
2. 页面不再出现“下载模板”“上传数据”“恢复数据”等入口或文案。
3. `/admin/dashboard/import` 不再提供导入/模板页面；若保留路由，应重定向到 `/admin/dashboard/data/exchange`。
4. `GET /api/data-exchange?mode=template` 不再返回模板工作簿。
5. `POST /api/data-exchange` 不再执行数据恢复。
6. 默认选中全部工作表。
7. 用户可以只选择一个或多个工作表导出。
8. 未选择任何工作表时，导出按钮不可点击。
9. 导出的 Excel 只包含被选中的工作表。
10. 每个工作表首行均为中文表头。
11. Excel 中不再出现 `created_at`、`price_cents`、`product_id` 等英文数据库字段作为表头。
12. 表选择来自统一映射：页面展示中文工作表名，请求传递稳定表 key，后端按同一份 `tableMap` 解析。
13. 字段表头来自统一映射：所有 `columns` 都必须命中 `columnLabels`，缺失中文表头时不能生成英文表头文件。
14. 导出的数据行数量与对应数据库表查询结果一致。
15. `npm run lint` 通过。
16. `npm run build` 通过。

## 10. 风险与注意事项

1. 表选择和中文表头都依赖统一映射配置，开发时应避免在页面、接口或工具函数中维护第二套硬编码映射。
2. 下线导入功能时，需要确认导航、旧路由和 API 都不可再触达导入/模板能力，不能只删页面按钮。
3. `tables` 参数必须通过 `tableMap` 解析，不能直接参与 SQL 拼接。
4. 金额字段仍是“分”，表头必须写清楚单位。
5. 如果未来要恢复导入能力，需要重新设计导入文件格式和中文表头反向映射，不能默认复用本次中文导出文件。

## 11. 后续可选增强

1. 支持字段级选择。
2. 支持金额从“分”导出为“元”。
3. 支持状态枚举中文化，例如 `paid` 导出为 `已付款`。
4. 增加导出预览，显示每个工作表的数据行数。
5. 增加常用导出预设，例如“商品库存”“销售财务”“采购入库”。
