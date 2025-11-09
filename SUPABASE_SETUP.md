# Supabase 数据库配置指南

本项目已配置支持 Supabase PostgreSQL 数据库。按照以下步骤即可快速连接。

## 快速开始

### 1. 获取 Supabase 连接信息

登录 [Supabase Dashboard](https://app.supabase.com/)，进入你的项目：

#### 方式一：使用 Project URL + Service Role Key（推荐）

1. **获取 Project URL**
    - 导航至：Settings → API
    - 复制 "Project URL"（例如：`https://xxxxx.supabase.co`）

2. **获取 Service Role Key**
    - 在同一页面找到 "Project API keys"
    - 复制 "service_role" key（**注意：不是 anon key**）
    - ⚠️ 警告：service_role key 拥有完全权限，请勿暴露给客户端

#### 方式二：使用数据库密码

1. 导航至：Settings → Database
2. 在 "Connection string" 部分找到你的数据库密码
3. 或者点击 "Reset Database Password" 重置密码

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，添加 Supabase 连接信息：

#### 使用 Project URL + Service Role Key

```env
SUPABASE_PROJECT_URL=https://xxxxx.supabase.co
SUPABASE_API_KEY=your_service_role_key_here
```

#### 或使用数据库密码

```env
SUPABASE_PROJECT_URL=https://xxxxx.supabase.co
SUPABASE_DB_PASSWORD=your_database_password_here
```

### 3. 初始化数据库表

运行数据库初始化脚本：

```bash
npm run db:init
```

这将创建所需的表结构：

- `products` - 产品表
- `packages` - 套餐表
- `package_items` - 套餐配件关联表
- `users` - 用户表（管理员认证）

### 4. 启动项目

```bash
npm run dev
```

访问 `http://localhost:3000` 查看应用。

## 连接配置说明

### 自动检测机制

`lib/db.ts` 文件会自动检测连接方式：

1. **Supabase 模式**：如果检测到 `SUPABASE_PROJECT_URL` 环境变量
    - 自动启用 SSL 连接
    - 使用 Supabase 专用的数据库主机格式
    - 连接到 `postgres` 数据库（默认）

2. **传统 PostgreSQL 模式**：如果未检测到 Supabase 配置
    - 使用传统的 PostgreSQL 连接参数
    - 支持本地开发环境

### 连接参数

| 参数  | Supabase                                    | 传统 PostgreSQL       |
|-----|---------------------------------------------|---------------------|
| 用户名 | `postgres` (固定)                             | `POSTGRES_USER`     |
| 密码  | `SUPABASE_API_KEY` 或 `SUPABASE_DB_PASSWORD` | `POSTGRES_PASSWORD` |
| 主机  | 自动从 Project URL 提取                          | `POSTGRES_HOST`     |
| 端口  | `5432` (固定)                                 | `POSTGRES_PORT`     |
| 数据库 | `postgres` (固定)                             | `POSTGRES_DB`       |
| SSL | 必需                                          | 可选                  |

## 数据库表结构

### products 表

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### packages 表

```sql
CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### package_items 表

```sql
CREATE TABLE package_items
(
    id         SERIAL PRIMARY KEY,
    package_id INTEGER REFERENCES packages (id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products (id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP        DEFAULT CURRENT_TIMESTAMP
);
```

## 常见问题

### Q1: 连接失败，显示 SSL 错误

**解决方案**：确保使用的是 Project URL，而不是直接的 IP 地址。Supabase 要求 SSL 连接。

### Q2: 认证失败

**解决方案**：

1. 检查是否使用了正确的 service_role key（不是 anon key）
2. 或者使用数据库密码（从 Settings → Database 获取）

### Q3: 找不到数据库

**解决方案**：Supabase 默认数据库名称是 `postgres`，代码已自动配置。

### Q4: 需要切换回本地数据库

**解决方案**：从 `.env.local` 中删除或注释掉 `SUPABASE_PROJECT_URL`，系统会自动切换到传统 PostgreSQL 模式。

## API 降级策略

当数据库连接失败时，API 会自动降级使用内存中的测试数据：

- `/api/products` - 返回 24 个测试产品
- `/api/packages` - 返回 3 个测试套餐

这确保了应用在数据库不可用时仍能正常展示和测试 UI。

## 安全提示

⚠️ **重要安全提示**：

1. 永远不要将 `.env.local` 文件提交到 Git
2. Service Role Key 拥有完全数据库权限，仅用于服务器端
3. 在生产环境使用环境变量管理平台（Vercel、Railway 等）
4. 定期轮换数据库密码和 API keys

## 生产部署

### Vercel 部署

1. 在 Vercel 项目设置中添加环境变量：
    - `SUPABASE_PROJECT_URL`
    - `SUPABASE_API_KEY` 或 `SUPABASE_DB_PASSWORD`

2. 重新部署项目

### 其他平台

在对应平台的环境变量配置中添加相同的变量即可。

## 需要帮助？

- [Supabase 文档](https://supabase.com/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [项目 Issues](https://github.com/your-repo/issues)
