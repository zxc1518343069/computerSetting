# 售后服务模块产品方案

## 完成情况

状态：已完成并归档。

完成内容：

- 前台新增「售后服务」导航入口和 `/after-sales` 页面。
- 前台支持服务分类目录、服务搜索、服务选择、数量调整、checkout 汇总条和确认下单 Modal。
- `POST /api/after-sales/checkout` 已作为占位接口完成，只返回模拟提交结果，不生成真实订单。
- 后台新增「服务管理 / 售后服务」页面。
- 后台支持服务项目、服务分类、温馨提示的新增、编辑、删除、启停和排序。
- SQLite 已新增售后服务分类、服务项目、温馨提示三张表，并提供默认 seed 数据。
- API、service 层、共享类型、迁移和构建校验已完成。

未纳入本方案范围：

- 真实下单生成订单。
- 订单列表来源分类。
- 售后服务订单明细表。
- 售后订单收款、退款、库存、工单流转。

真实订单接入已拆分到 `plans/todo/after-sales-order-integration-plan.md`。

## 1. 背景

当前系统前台已经包含 DIY 整机、产品零售、二手、租赁等入口，后台也已有商品、套餐、订单、客户、财务等管理模块。门店线下已有一张「华硕明远 DIY 售后服务价目表」，但线上系统暂未承载售后服务内容，导致客户查看、员工维护、价格更新仍依赖图片或线下物料。

本方案目标是在前台首页导航增加「售后服务」模块，并在 admin 后台新增售后服务管理能力，让服务内容、价格、说明、上下架状态可维护。

## 2. 设计目标

- 前台让客户快速查看门店可提供的售后服务、价格和注意事项。
- 后台让管理员可增删改查服务内容和价格，无需改代码即可更新价目表。
- 数据结构预留分类、排序、价格类型、说明、启停状态，支持从当前价目表平滑迁移。
- 视觉和交互沿用现有 `SiteHeader`、admin dashboard、Ant Design + Tailwind 的系统风格。
- 第一版聚焦「服务价目表展示 + 后台维护」，暂不做预约、支付、售后工单闭环。

## 3. 用户与场景

### 3.1 前台客户

- 进站后从顶部导航进入「售后服务」。
- 浏览清洁、系统安装、装机调试、上门服务等服务项目。
- 看到明确价格、补充说明和注意事项，例如是否含配件费、数据清理前需备份。
- 根据价格表联系门店或到店处理。

### 3.2 门店员工 / 管理员

- 在后台进入「售后服务」菜单。
- 新增服务项目，例如「台式机拆机」。
- 修改服务名称、价格、说明、分类、展示顺序、是否启用。
- 删除误建项目；对已有历史使用可能的项目优先停用。
- 维护底部温馨提示，保持前台说明一致。

## 4. 产品范围

### 4.1 本期包含

- 前台导航新增「售后服务」入口。
- 新增前台页面 `/after-sales`，展示售后服务价目表。
- 后台侧边栏新增「服务管理」分组，并加入「售后服务」管理入口。
- 新增后台页面 `/admin/dashboard/services/after-sales`。
- 支持服务项目 CRUD：列表、新增、编辑、删除、启停、排序。
- 支持服务分类 CRUD：分类名称、说明、启停、排序。
- 支持服务项目按分类展示。
- 支持多价格展示，例如 `99元/139元`、`120元/150元/200元`。
- 支持前台选择服务、调整数量、查看 checkout 汇总和下单确认弹窗。
- 提供 checkout 占位接口；确认下单只返回模拟提交结果，不生成真实订单。
- 支持维护服务说明、包含/不包含内容和温馨提示。
- 提供 REST API 和 SQLite 表结构迁移。

### 4.2 本期不包含

- 线上预约、排队、派单、服务进度流转。
- 售后服务真实订单创建、收款、退款、财务入账。
- 与客户信息、销售订单、库存配件扣减的联动。
- 图片 OCR 自动导入。第一版可手工录入或 seed 初始数据。

## 5. 信息架构

### 5.1 前台导航

在 `app/_components/SiteHeader.tsx` 的 `navItems` 中新增：

- 文案：`售后服务`
- 路由：`/after-sales`
- 图标建议：`CustomerServiceOutlined` 或 `ToolOutlined`
- 激活规则沿用 `isActive('/after-sales')`

导航顺序建议：

```text
DIY整机 / 产品零售 / 二手 / 租赁 / 售后服务
```

如果移动端后续需要适配，应一起补一个折叠菜单。目前 `SiteHeader` 桌面导航是 `hidden md:flex`，移动端没有完整导航入口，这是一个顺手可记录的既有问题。

### 5.2 前台售后服务页

路由：`app/after-sales/page.tsx`

页面结构建议：

- 顶部标题区：`售后服务价目表`，副标题说明“价格仅含服务费，不含配件费”。
- 分类导航：桌面端使用左侧纵向分类目录；移动端使用下拉选择，避免横向滚动分类条。
- 服务项目列表：桌面端右侧双栏价目表；移动端单列卡片。
- 服务选择：每个服务项支持勾选；勾选后可调整数量。
- Checkout 条：存在已选服务时底部展示已选数量、固定价合计、清空和下单按钮。
- 下单确认：点击下单后展示 Modal，包含服务汇总、价格汇总、取消和确认下单。
- 价格展示：突出金额，保留多价格文案。
- 说明展示：项目描述、适用范围、备注。
- 温馨提示：底部统一展示，不与项目混在一起。

### 5.3 后台售后服务管理

路由：`app/admin/dashboard/services/after-sales/page.tsx`

菜单建议：新增「服务管理」分组。

```text
服务管理
- 售后服务
```

后台页面结构建议：

- 顶部操作区：标题、说明、刷新、新增服务。
- 统计卡片：全部服务、启用服务、分类数、最低/最高服务价。
- 筛选区：关键词、分类、启用状态。
- 表格列：服务名称、分类、价格、说明、排序、启用、更新时间、操作。
- 操作：编辑、删除、启用/停用。
- Modal 表单：新增/编辑服务项目。

## 6. 数据设计

### 6.1 服务分类表

建议拆分类表，方便前台分组和后台筛选。第一版也可以只用枚举字段，但从当前系统已有 `product_categories` 的动态类目经验看，拆表更稳。

表：`after_sales_service_categories`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER PK | 分类 ID |
| `code` | TEXT UNIQUE | 分类编码，例如 `cleaning` |
| `name` | TEXT | 分类名称，例如 `清洁保养` |
| `description` | TEXT | 分类说明，可空 |
| `sort_order` | INTEGER | 展示排序 |
| `is_active` | INTEGER | 是否启用 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

### 6.2 服务项目表

表：`after_sales_services`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER PK | 服务 ID |
| `code` | TEXT UNIQUE | 稳定编码，用于默认数据幂等 seed，例如 `system_reinstall_simple` |
| `category_id` | INTEGER FK | 所属分类 |
| `name` | TEXT | 服务名称 |
| `description` | TEXT | 服务描述，可空 |
| `price_type` | TEXT | `fixed` / `range` / `multi` / `custom` |
| `price_cents` | INTEGER | 单一价格，单位分；多价格时可为空 |
| `price_label` | TEXT | 展示价格文案，例如 `99元/139元` |
| `unit` | TEXT | 计价单位，例如 `次`、`套`、`台`，可空 |
| `includes` | TEXT | 包含内容，可空 |
| `excludes` | TEXT | 不包含内容，可空，例如 `不含配件费` |
| `sort_order` | INTEGER | 展示排序 |
| `is_featured` | INTEGER | 是否重点展示 |
| `is_active` | INTEGER | 是否启用 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

价格设计说明：

- 金额仍按系统习惯用 `*_cents` 存储，避免浮点误差。
- `price_label` 作为前台最终展示文案，解决 `10元/159元`、`市区/东区/乡镇 50元/80元/120元` 这类非单价场景。
- 后续如果要按规格精确报价，可再新增 `after_sales_service_price_options` 表，不建议第一版过度拆。

### 6.3 服务提示表

表：`after_sales_service_notices`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER PK | 提示 ID |
| `code` | TEXT UNIQUE | 稳定编码，用于默认数据幂等 seed，例如 `backup_notice` |
| `content` | TEXT | 提示内容 |
| `sort_order` | INTEGER | 展示排序 |
| `is_active` | INTEGER | 是否启用 |
| `created_at` | TEXT | 创建时间 |
| `updated_at` | TEXT | 更新时间 |

第一版也可以把提示写死在页面里，但考虑这张价目表底部有多条门店声明，建议一起后台维护。

## 7. API 设计

所有接口沿用现有 `lib/request/apiResponse.ts` 响应结构：成功返回 `{ code: 200, message, data }`，失败返回 `{ code, message }`。前端请求统一通过 `app/services/afterSales.ts` 调用，注意 `lib/request/axios.ts` 已配置 `baseURL: '/api'`，service 中应使用 `/after-sales/...`，不要再写 `/api/after-sales/...`。

### 7.1 前台读取

- `GET /api/after-sales/services`
    - 查询启用分类、启用服务、启用提示。
    - 返回按分类分组的数据，便于前台直接渲染。
    - 公开接口，不要求登录。
- `POST /api/after-sales/checkout`
    - 前台 checkout 占位接口。
    - 只校验已选服务不为空并返回模拟 `checkout_no`。
    - 不写入 `sales_orders`，不生成真实订单，不触发财务或库存逻辑。

建议响应结构：

```ts
type AfterSalesPriceType = 'fixed' | 'range' | 'multi' | 'custom';

interface AfterSalesService {
    id: number;
    code?: string | null;
    category_id: number;
    category_name?: string;
    name: string;
    description?: string | null;
    price_type: AfterSalesPriceType;
    price: number | null;
    price_label: string;
    unit?: string | null;
    includes?: string | null;
    excludes?: string | null;
    sort_order: number;
    is_featured: boolean;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

interface AfterSalesServiceListResponse {
    categories: Array<{
        id: number;
        code: string;
        name: string;
        description?: string;
        sort_order: number;
        services: AfterSalesService[];
    }>;
    notices: Array<{
        id: number;
        code?: string | null;
        content: string;
        sort_order: number;
    }>;
}
```

### 7.2 后台管理

后台接口必须在 route handler 内调用 `requireAdminUser()` 并处理 `isAuthError(e)`。现有 `middleware.ts` 只统一拦截 API 写操作和少数敏感 GET；后台管理 GET 如果不在 handler 内校验，登录外也可能读取完整管理数据。

服务项目：

- `GET /api/after-sales/admin/services?includeInactive=true&keyword=&categoryId=&status=`
    - 登录后可访问。
    - 默认返回全部服务；`includeInactive=false` 时只返回启用服务。
    - `status` 可选 `active` / `inactive`，优先级高于 `includeInactive`。
- `POST /api/after-sales/admin/services`
    - 登录后可访问。
    - 创建服务项目。
- `GET /api/after-sales/admin/services/[id]`
    - 登录后可访问。
- `PUT /api/after-sales/admin/services/[id]`
    - 登录后可访问。
    - 更新服务项目。
- `DELETE /api/after-sales/admin/services/[id]`
    - 登录后可访问。
    - 第一版物理删除；后续如果接入售后订单，应改为“有引用则禁止删除，只能停用”。

分类：

- `GET /api/after-sales/admin/categories?includeInactive=true`
- `POST /api/after-sales/admin/categories`
- `PUT /api/after-sales/admin/categories/[id]`
- `DELETE /api/after-sales/admin/categories/[id]`

删除分类前需要检查是否存在服务项目。若存在服务，返回 `400`，提示先迁移或停用服务；不建议级联删除。

提示：

- `GET /api/after-sales/admin/notices?includeInactive=true`
- `POST /api/after-sales/admin/notices`
- `PUT /api/after-sales/admin/notices/[id]`
- `DELETE /api/after-sales/admin/notices/[id]`

### 7.3 请求 payload

服务项目创建/更新：

```ts
interface AfterSalesServicePayload {
    code?: string | null;
    category_id: number;
    name: string;
    description?: string | null;
    price_type: 'fixed' | 'range' | 'multi' | 'custom';
    price?: number | null;
    price_label?: string;
    unit?: string | null;
    includes?: string | null;
    excludes?: string | null;
    sort_order?: number;
    is_featured?: boolean;
    is_active?: boolean;
}
```

分类创建/更新：

```ts
interface AfterSalesCategoryPayload {
    code?: string | null;
    name: string;
    description?: string | null;
    sort_order?: number;
    is_active?: boolean;
}
```

提示创建/更新：

```ts
interface AfterSalesNoticePayload {
    code?: string | null;
    content: string;
    sort_order?: number;
    is_active?: boolean;
}
```

### 7.4 校验规则

- `id`、`category_id` 必须是正整数。
- `name`、分类 `name`、提示 `content` trim 后不能为空。
- `price_type` 只允许 `fixed`、`range`、`multi`、`custom`。
- `fixed` 类型建议要求 `price` 大于等于 0；服务端用 `yuanToCents` 入库。
- `multi`、`range`、`custom` 类型允许 `price` 为空，但 `price_label` 必填。
- `price_label` 未传且 `price_type='fixed'` 时，服务端可根据 `price` 自动生成，例如 `30元`。
- `sort_order` 为空时自动使用当前最大排序值 + 10。
- `code` 只给默认 seed 或后续导入使用；后台表单不必暴露，用户新增时可以为空。
- `code` 如果传入则需要 trim 后校验唯一性；唯一约束冲突时返回 `400` 和明确提示。
- 停用分类不自动停用其下服务；前台公开接口必须同时过滤启用分类和启用服务。

如果第一版想压缩工作量，可以先只做服务项目 CRUD，分类和提示使用 seed 数据；但产品体验上建议把提示也做成可维护。

## 8. 后台表单字段

新增/编辑服务 Modal：

- 服务名称：必填，例如 `电脑系统安装/重装服务（精装）`。
- 所属分类：必填，下拉选择。
- 价格类型：必填，单选 `固定价`、`多价格`、`面议/自定义`。
- 金额：固定价时必填，输入元，提交时转分。
- 展示价格：多价格或自定义时必填，例如 `120元/150元/200元`。
- 计价单位：可选，例如 `次`。
- 服务描述：可选，显示在前台副文案。
- 包含内容：可选，例如 `包含屏幕清洁、外观清洁、主板清洁、风道堵塞疏通、更换硅脂等`。
- 不包含内容：可选，例如 `不含配件费`。
- 是否重点展示：开关。
- 是否启用：开关。
- 排序值：数字，越小越靠前。

删除规则建议：

- 未被任何未来售后订单引用时允许删除。
- 如果后续接入售后订单，已引用项目不允许物理删除，只允许停用。
- 第一版没有订单引用时可直接删除，但 UI 上仍建议给出“删除后前台不再展示”的确认。

## 9. 前台展示交互

### 9.1 桌面端

- 页面主体最大宽度建议 `max-w-6xl`。
- 分类筛选使用左侧 sticky 纵向目录，主内容区按分类展示服务项目。
- 服务列表支持双栏，保留价目表的“服务名 - 虚线 - 价格”的轻量视觉联想。
- 服务项支持 checkbox 选择；已选状态需要有清晰视觉反馈。
- 底部 checkout 条展示已选服务数量、固定价合计、清空和下单按钮。
- 重点服务可使用轻微强调，而不是营销大卡。

### 9.2 移动端

- 分类筛选使用下拉选择或折叠目录，不使用横向滚动分类条。
- 服务项目单列，价格靠右或置顶右侧。
- 已选服务后底部 sticky checkout 条保持可见。
- 长说明折行展示，避免挤压价格。

### 9.3 空状态和异常

- 没有启用服务：展示 `暂无售后服务项目`。
- API 失败：使用 Ant Design `Alert` 或轻提示，并保留重试按钮。
- 价格为空：展示 `到店咨询` 或后台配置的 `price_label`。
- 多价格、区间价、自定义价服务允许选择，但 checkout 汇总中价格标记为“到店确认”，不计入固定价合计。

## 10. 首批数据建议

基于参考图片，建议初始化以下分类和服务项目。图片有反光和裁切，个别文字需要人工复核后录入。

### 10.1 检测/系统

| 服务 | 价格 | 说明 |
| --- | --- | --- |
| 电脑软硬件问题检测 | 30元 |  |
| 电脑密码清除（不清资料） | 30元 |  |
| 电脑系统安装/重装服务（简装） | 30元 |  |
| 电脑系统安装/重装服务（精装） | 59元 | 一对一品牌针对性专业安装驱动软件调试，笔记本优先选择 |
| 台式机/笔记本新机验机 | 50元 | 包含系统开荒、正品检测、功能测试、硬盘分区等 |
| WIN10/WIN11 系统桌面美化 | 69元 |  |

### 10.2 清洁保养

| 服务 | 价格 | 说明 |
| --- | --- | --- |
| 笔记本电脑清洁（带换硅脂） | 80元 | 本服务赠送免费原装硅脂，如需高性能硅脂可另外购买 |
| 笔记本电脑深度清洁 | 299元 | 包含屏幕清洁、外观清洁、主板清洁、风道堵塞疏通、更换硅脂等 |
| 台式电脑深度清洁 | 299元 | 整机零件全部拆除清洁，包含理线等服务，时间需要两个小时左右 |
| 键盘深度清洁（小/大） | 99元/139元 |  |

### 10.3 装机/硬件服务

| 服务 | 价格 | 说明 |
| --- | --- | --- |
| 台式电脑理线布局规整（简约） | 59元 |  |
| 台式电脑理线布局规整（精装） | 199元 |  |
| 笔记本加装硬盘/内存服务费 | 50元 |  |
| 台式机拆机 | 80元 |  |
| 台式机代装机：风冷/水冷/海景房满风扇 | 120元/150元/200元 |  |

### 10.4 软件服务

| 服务 | 价格 | 说明 |
| --- | --- | --- |
| 专业软件安装 单个/全套 | 10元/159元 | PS、PR、AI、AU、CAD 等专业软件安装单个 10 元，全套终身服务，随时可远程安装 |
| 个人软件终身服务 | 899元 | 包含所有软件服务，重装系统、专业软件安装（全套）等个人终身服务 |

### 10.5 上门服务

| 服务 | 价格 | 说明 |
| --- | --- | --- |
| 上门服务费（不含维修）：市区/东区/乡镇 | 50元/80元/120元 |  |

### 10.6 温馨提示

- 对于所有需要清理硬盘的服务，重要数据请提前备份，我们对您的数据不负有保管责任，如若数据丢失，本店概不负责。
- 笔记本清灰属正常保养服务，不会对您的电脑造成任何损坏，且不会影响后续原厂保修服务。清灰过程中本店监控全程记录，如清灰完成离店后电脑出现任何硬件问题，本店概不负责，感谢您的理解。
- 对于年代久远、无配件的老机器可能无法维修。
- 本报价仅含各项目服务费，不含配件费，配件价格随市场波动，实报实销。

## 11. 技术设计

### 11.1 文件结构

建议新增或修改以下文件：

```text
app/
├── after-sales/page.tsx
├── admin/dashboard/layout.tsx
├── admin/dashboard/services/after-sales/page.tsx
├── api/after-sales/services/route.ts
├── api/after-sales/admin/services/route.ts
├── api/after-sales/admin/services/[id]/route.ts
├── api/after-sales/admin/categories/route.ts
├── api/after-sales/admin/categories/[id]/route.ts
├── api/after-sales/admin/notices/route.ts
├── api/after-sales/admin/notices/[id]/route.ts
└── services/afterSales.ts

lib/db/
├── schema.sql
├── migrations.js
└── afterSalesServices.ts

const/
└── types.ts
```

如果后台页面超过 200 行，按项目约定拆到：

```text
app/admin/dashboard/services/after-sales/
├── page.tsx
├── components/
│   ├── ServiceTable.tsx
│   ├── ServiceModal.tsx
│   ├── CategoryModal.tsx
│   └── NoticeModal.tsx
└── hooks/
    └── useAfterSalesServices.ts
```

前台页面如果交互较轻，可以先单文件实现；如果后续加入预约，再拆 `_components`。

### 11.2 SQLite DDL

在 `lib/db/schema.sql` 增加：

```sql
CREATE TABLE IF NOT EXISTS after_sales_service_categories
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT NOT NULL CHECK (name <> ''),
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_after_sales_categories_active_sort
    ON after_sales_service_categories(is_active, sort_order);

CREATE TABLE IF NOT EXISTS after_sales_services
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    category_id INTEGER NOT NULL REFERENCES after_sales_service_categories(id),
    name TEXT NOT NULL CHECK (name <> ''),
    description TEXT,
    price_type TEXT NOT NULL DEFAULT 'fixed'
        CHECK (price_type IN ('fixed', 'range', 'multi', 'custom')),
    price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
    price_label TEXT NOT NULL DEFAULT '',
    unit TEXT,
    includes TEXT,
    excludes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_after_sales_services_category_sort
    ON after_sales_services(category_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS after_sales_service_notices
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    content TEXT NOT NULL CHECK (content <> ''),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_after_sales_notices_active_sort
    ON after_sales_service_notices(is_active, sort_order);
```

说明：

- 暂不加 `ON DELETE CASCADE`，避免删除分类时误删服务项目。
- `price_label` 保持非空字符串，前台统一使用它展示价格；固定价可以由服务端自动生成。
- SQLite `CHECK (name <> '')` 不能替代服务端 trim 校验，API 仍要先 trim。

### 11.3 迁移与默认数据

在 `lib/db/migrations.js` 新增：

- `ensureAfterSalesServiceTables(database)`：创建三张表和索引。
- `seedDefaultAfterSalesServices(database)`：按 `code` 幂等插入默认分类、服务、提示。
- 在 `initializeSqliteDatabase` 中调用上述方法，调用位置建议放在基础业务表初始化之后。

seed 策略：

- 分类使用固定 `code`：`diagnosis_system`、`cleaning`、`hardware`、`software`、`onsite`。
- 服务项目使用固定 `code`：例如 `hardware_detection`、`system_reinstall_simple`、`keyboard_cleaning`。
- 提示使用固定 `code`：例如 `backup_notice`、`cleaning_notice`。
- 使用 `INSERT OR IGNORE` 创建默认项，再按 `code` 查询 ID，确保重复迁移不会重复插入。
- 不建议每次迁移覆盖已有记录，避免后台已调整的价格被 seed 回滚。
- 如果后续必须更新默认文案，新增显式迁移函数，按版本或特定条件更新。

### 11.4 DB helper 设计

新增 `lib/db/afterSalesServices.ts`，职责类似 `lib/db/productCategories.ts`：

- 定义 row 类型：`AfterSalesCategoryRow`、`AfterSalesServiceRow`、`AfterSalesNoticeRow`。
- 定义前端序列化：`serializeAfterSalesCategory`、`serializeAfterSalesService`、`serializeAfterSalesNotice`。
- `price_cents` 出库通过 `centsToYuan` 转成 `price`。
- 入库时 `price` 通过 `yuanToCents` 转成 `price_cents`。
- 提供 `getAfterSalesCategoryById`、`getAfterSalesServiceById`。
- 提供 `getNextSortOrder(db, table, where?)` 或局部工具，新增时默认最大排序 + 10。
- 提供 `normalizePriceType(value)`，只返回允许值。
- 提供 `createFixedPriceLabel(price)`，固定价自动生成 `30元`；整数不显示小数，非整数最多保留两位。

序列化后的字段建议保持下划线风格，与现有 `ProductCategory`、API 返回风格一致。

### 11.5 Route handler 设计

Route handler 要遵循现有模式：

- 使用 `getDb()` 获取 SQLite 实例。
- 使用 `success()` / `error()` 返回统一结构。
- 后台管理接口开头调用 `await requireAdminUser()`。
- catch 中先处理 `isAuthError(e)`，再记录 `console.error`，最后返回 500。
- 所有动态路由的 `params` 按 Next.js 15 当前写法处理为 `Promise<{ id: string }>`。
- 建议所有 after-sales route 增加 `export const dynamic = 'force-dynamic';`，避免价格类数据被误缓存。

前台 `GET /api/after-sales/services` 查询逻辑：

1. 查启用分类：`is_active = 1`，按 `sort_order ASC, id ASC`。
2. 查启用服务并 join 分类，按分类排序、服务排序。
3. 查启用提示，按排序。
4. 在服务端按分类组装响应；没有服务的启用分类可不返回，避免前台出现空分类。

后台服务列表查询逻辑：

1. 拼接 `WHERE` 条件时使用参数绑定，不拼接用户输入。
2. `keyword` 搜索 `s.name`、`s.description`、`s.price_label`。
3. `categoryId` 有效时筛选分类。
4. 返回服务时带上分类名称，方便表格展示。

### 11.6 前端类型与 service 层

在 `const/types.ts` 增加：

```ts
export type AfterSalesPriceType = 'fixed' | 'range' | 'multi' | 'custom';

export interface AfterSalesCategory { /* 与 API 响应一致 */ }
export interface AfterSalesService { /* 与 API 响应一致 */ }
export interface AfterSalesNotice { /* 与 API 响应一致 */ }
```

在 `app/services/afterSales.ts` 增加：

- `fetchPublicAfterSalesServices()`
- `submitAfterSalesCheckout(payload)`：调用 checkout 占位接口，不生成真实订单。
- `fetchAdminAfterSalesServices(params)`
- `createAfterSalesService(payload)`
- `updateAfterSalesService(id, payload)`
- `deleteAfterSalesService(id)`
- 分类和提示对应 CRUD 方法。

同时在 `app/services/index.ts` 导出 `afterSales` service。

注意：项目里部分旧 service 使用了 `/api/products`，但当前 axios `baseURL` 是 `/api`。新 service 应采用 `'/after-sales/services'` 这种写法，避免变成 `/api/api/...`。

### 11.7 后台页面实现细节

后台页面建议使用一个页面承载三类维护：服务项目、分类、温馨提示。

- 用 Ant Design `Tabs` 或顶部 Segmented 分为 `服务项目`、`服务分类`、`温馨提示`。
- 默认打开 `服务项目`，因为这是最高频操作。
- 服务项目表格支持筛选分类、状态、关键词。
- 分类表格支持新增、编辑、停用、删除。
- 温馨提示表格支持新增、编辑、排序、启停、删除。
- 表单金额输入用 `InputNumber`，单位元，最小值 0，精度 2。
- `price_type` 切换时联动字段：固定价显示金额；多价格/范围/自定义显示展示价格。
- 提交前在前端做基础校验，后端仍保留完整校验。
- 删除使用 `Popconfirm`，删除分类时如果 API 返回存在服务，直接展示错误提示。

权限：第一版 `admin` 和 `staff` 都可维护售后服务，沿用 `requireAdminUser()`；如果后续要限制到超级管理员，再改为 `requireSuperAdmin()`。

### 11.8 前台页面实现细节

前台 `/after-sales` 建议做成 client component，方便分类筛选和加载状态，也可以由 server component 拉取 API 后把筛选交给 client 子组件。第一版为了和现有前台页面一致，建议直接 client component。

- 外层使用 `Layout` + `SiteHeader`，与 `/retail`、`/gamesList` 保持一致。
- 使用 `useRequest(fetchPublicAfterSalesServices)` 获取数据。
- 分类筛选只在前端过滤，不额外请求。
- 价格展示优先使用 `price_label`；为空时若 `price` 有值则兜底展示 `¥${price}`；都为空时展示 `到店咨询`。
- 支持前端服务选择和数量调整。
- 已选服务后展示底部 checkout 条；点击下单展示汇总 Modal。
- 确认下单调用 `POST /api/after-sales/checkout` 占位接口，只提示模拟提交成功。
- 服务说明、包含内容、不包含内容按存在性展示，不出现空标题。
- 温馨提示底部展示为编号列表。
- 页面不做营销型 landing hero，第一屏直接是服务价目表内容。

### 11.9 安全、兼容与性能

- 后台所有 route handler 自行鉴权，不能只依赖 middleware。
- 所有 SQL 条件使用参数绑定。
- 删除分类前检查服务数量，防止孤儿数据或误删。
- 前台读取仅返回启用服务，不暴露停用项目。
- 金额统一使用分入库、元出库，前端不要自行拼接后台提交的 `price_cents`。
- 默认数据 seed 必须幂等，不覆盖后台人工改价。
- 当前数据量很小，不需要分页；如果后续超过 200 条服务，再给后台列表加分页。
- 公共接口可不缓存；价格类数据更重视实时性。

### 11.10 实现顺序建议

1. 先做表结构、迁移、seed 和 db helper。
2. 再做前台读取 API，用 API 直接验证默认数据。
3. 再做后台 CRUD API。
4. 再做后台页面，用真实 CRUD 闭环验证。
5. 最后做前台页面和导航入口。

这个顺序能让数据层先稳定下来，避免 UI 做完后再返工字段。

## 12. 技术落地路径

### Phase 1：数据层与 API

- 在 `lib/db/schema.sql` 增加三张表。
- 在 `lib/db/migrations.js` 增加 `ensureAfterSalesServiceTables` 和默认 seed。
- 新增 `lib/db/afterSalesServices.ts`，负责 row 类型、序列化、默认数据、查询封装。
- 新增 API route：前台读取和后台服务、分类、提示 CRUD。
- 新增 checkout 占位 API route：`POST /api/after-sales/checkout`。
- 新增 `app/services/afterSales.ts`，封装前后台请求。

### Phase 2：后台管理页

- 在 `app/admin/dashboard/layout.tsx` 增加「服务管理 / 售后服务」菜单。
- 新增 `app/admin/dashboard/services/after-sales/page.tsx`。
- 使用 `useRequest` 拉取服务项目、分类、提示。
- 使用 Ant Design `Table`、`Modal`、`Form`、`InputNumber`、`Select`、`Switch`、`Popconfirm`。
- 表单提交后刷新列表，错误通过 `message.error` 提示。

### Phase 3：前台展示页

- 在 `app/_components/SiteHeader.tsx` 增加售后服务导航。
- 新增 `app/after-sales/page.tsx`。
- 使用服务 API 渲染分类和项目。
- 做好桌面左侧分类目录 + 右侧双栏、移动下拉分类 + 单列列表、服务选择、checkout 汇总 Modal 和空状态。

### Phase 4：验收与打磨

- 执行 `npm run lint`。
- 访问前台 `/after-sales`，确认导航激活、分类筛选、价格和说明展示正确。
- 访问后台 `/admin/dashboard/services/after-sales`，确认新增、编辑、删除、启停、排序生效。
- 重启本地服务或重新初始化数据库后，确认 seed 数据不会重复插入。

## 13. 验收标准

- 前台导航栏可看到「售后服务」，点击进入服务价目表。
- 前台只展示启用分类和启用服务，排序稳定。
- 前台可选择服务并调整数量，已选后出现 checkout 下单按钮。
- 点击下单后展示服务汇总和价格汇总 Modal，包含取消和确认下单按钮。
- 确认下单只调用占位接口并提示成功，不生成真实订单。
- 后台可新增、编辑、删除售后服务项目。
- 后台可新增、编辑、删除服务分类和温馨提示。
- 后台可修改服务价格，前台刷新后展示新价格。
- 后台可停用某服务，前台不再展示。
- 删除存在服务项目的分类时，应阻止并提示先迁移或停用服务。
- 多价格文案能原样展示，例如 `120元/150元/200元`。
- 温馨提示能在前台底部展示。
- 重新运行 SQLite 初始化或迁移后，默认售后服务数据不会重复插入，也不会覆盖后台手动改价。
- lint 通过。

## 14. 后续扩展

- 售后服务下单与订单联动：已拆分到 `plans/todo/after-sales-order-integration-plan.md`，不纳入当前价目表模块范围。
- 售后预约：客户选择服务、填写联系方式、预约到店/上门时间。
- 售后工单：接机、检测、报价、维修中、待取机、已完成。
- 售后收款：服务费、配件费、优惠、付款状态。
- 客户资产：记录客户设备、历史服务、常见问题。
- 服务组合：多个服务一键打包，例如系统重装 + 软件安装。
- Excel 导入导出：批量维护服务价目表。

---

方案更新时间：2026-06-14
