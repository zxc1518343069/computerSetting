# 本地 SQLite 切换方案

## 目标

将当前依赖 Supabase/PostgreSQL 的数据访问切换为本地 SQLite，面向未来本地部署场景。

目标形态：

- 应用运行在本地电脑或局域网服务器上
- SQLite 数据库文件存放在本机
- 店内其他设备通过浏览器访问本机服务
- 不再依赖线上数据库即可完成报价、库存、订单和财务管理

## 技术选型

### 数据库

使用 SQLite。

原因：

- 本地部署简单，无需额外数据库服务
- 数据库就是一个文件，易备份、易迁移
- 当前业务是门店管理，不需要高并发写入
- 和 Next.js API route 配合简单

### Node 访问库

使用 `better-sqlite3`。

原因：

- 同步 API 简单直接，适合 API route 内部使用
- 性能和稳定性成熟
- 不需要引入完整 ORM，便于快速从现有 Supabase 查询迁移

## 数据库文件位置

默认数据库文件：

```text
data/computer.db
```

环境变量：

```text
SQLITE_DB_PATH=./data/computer.db
```

`data/` 目录需要加入 `.gitignore`，避免本地业务数据提交到仓库。

## 金额存储规则

数据库内所有金额字段统一使用“分”为单位的整数。

示例：

```text
¥12.34 -> 1234
```

命名规则：

```text
price_cents
cost_price_cents
final_amount_cents
shipping_fee_cents
misc_fee_cents
```

边界职责：

- 前端输入和展示：元
- API 入参和出参：元
- API 内部转换：元 <-> 分
- SQLite 存储：分

这样可以避免 JavaScript 和 SQLite 浮点金额误差。

## 数据访问边界

新增统一数据库模块：

```text
lib/db/index.ts
lib/db/money.ts
lib/db/schema.sql
```

职责：

- `lib/db/index.ts`: 创建 SQLite 连接，启用 foreign keys，执行初始化
- `lib/db/money.ts`: 金额转换函数
- `lib/db/schema.sql`: SQLite 表结构

API route 不直接打开数据库文件，统一通过 `lib/db` 获取连接。

## 迁移策略

### 第一阶段：建立本地 SQLite 基础设施

目标：

- 安装 `better-sqlite3`
- 新增 `data/` 忽略规则
- 新增 SQLite schema
- 新增初始化脚本
- 新增 DB 连接与金额转换工具

### 第二阶段：切核心 API 到 SQLite

优先迁移：

- `/api/products`
- `/api/pricing`
- `/api/suppliers`
- `/api/inbound-orders`
- `/api/inventory-items`
- `/api/orders`
- `/api/operating-costs`
- `/api/packages`

迁移规则：

- API 返回结构尽量保持不变
- 金额字段对前端仍返回元
- DB 内部字段使用 cents

### 第三阶段：导入线上旧数据

新增一次性迁移脚本：

```text
scripts/migrate-supabase-to-sqlite.ts
```

迁移内容：

- products
- pricing_config
- packages
- package_items

说明：

- 线上 Supabase 可作为旧数据来源
- 迁移后本地 SQLite 成为主数据源

### 第四阶段：移除 Supabase 依赖路径

目标：

- API route 不再使用 `lib/supabase.ts`
- 保留 Supabase 迁移脚本所需配置即可
- 文档标明本地部署备份方式

## 备份方案

第一版使用文件级备份：

```text
data/computer.db
```

建议后续新增：

```text
scripts/backup-sqlite.ts
```

备份输出：

```text
backups/computer-YYYYMMDD-HHmmss.db
```

## 当前执行范围

本轮先执行：

- 安装 `better-sqlite3`
- 建立 SQLite schema 和 DB 工具
- 添加初始化脚本
- 先迁移核心经营 API
- 保留 Supabase 迁移脚本为 TODO

## 当前落地进度

已完成：

- `better-sqlite3` 依赖接入
- `SQLITE_DB_PATH` 支持
- `data/computer.db` 初始化
- SQLite schema
- 金额转换工具：API 收发元，DB 存分
- 产品 API 切换到 SQLite
- 溢价配置 API 切换到 SQLite
- 供应商 API 切换到 SQLite
- 入库单 API 切换到 SQLite transaction
- 库存明细 API 切换到 SQLite
- 订单 API 切换到 SQLite
- 订单结算 API 切换到 SQLite transaction
- 经营成本 API 切换到 SQLite
- 套餐 API 切换到 SQLite

## TODO

- 从线上 Supabase 导出现有数据并导入 SQLite
- 增加 SQLite 数据库备份脚本
- 将订单结算逻辑放入 SQLite transaction
- 将数据交换适配 SQLite
- 将旧 Supabase 客户端从运行时 API 中移除
