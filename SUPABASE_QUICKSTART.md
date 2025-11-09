# Supabase 快速初始化指南

## ✅ 已完成的配置

- [x] 安装 `@supabase/supabase-js` SDK
- [x] 创建 Supabase 客户端配置 (`lib/supabase.ts`)
- [x] 更新所有 API 路由使用 Supabase 客户端
- [x] 准备 RLS 安全策略脚本
- [x] 配置环境变量

## 🚀 初始化步骤

### 步骤 1: 在 Supabase Dashboard 创建表

1. 打开 Supabase Dashboard: https://app.supabase.com/
2. 进入你的项目: **milarfpfqhegqpkwjann**
3. 点击左侧菜单 **SQL Editor**
4. 点击 **New Query** 创建新查询
5. 复制 `database/schema.sql` 的全部内容并粘贴
6. 点击 **Run** 执行脚本

### 步骤 2: 配置 RLS 安全策略

1. 在 SQL Editor 中创建另一个新查询
2. 复制 `database/setup-rls.sql` 的全部内容并粘贴
3. 点击 **Run** 执行脚本

### 步骤 3: 验证数据库

在 SQL Editor 中运行以下查询验证:

```sql
-- 查看所有表
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- 查看产品数据
SELECT * FROM products LIMIT 5;

-- 查看管理员用户
SELECT username FROM admin_users;
```

### 步骤 4: 启动应用

```bash
npm run dev
```

访问 http://localhost:3000 测试应用。

## 📋 环境变量配置

`.env.local` 已配置:

```env
SUPABASE_PROJECT_URL=https://milarfpfqhegqpkwjann.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...（你的 anon key）
```

## ✨ 使用 Supabase SDK 的优势

1. **更安全**: 使用 API Key 而不是数据库密码
2. **自动 RLS**: 支持行级别安全策略
3. **更简洁**: 链式 API 调用,无需编写原始 SQL
4. **实时功能**: 支持实时订阅(可选功能)
5. **类型安全**: 完整的 TypeScript 支持

## 📝 API 示例

### 查询产品

```typescript
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('category', 'cpu')
  .order('created_at', { ascending: false });
```

### 创建产品

```typescript
const { data, error } = await supabase
  .from('products')
  .insert([{ category: 'cpu', name: 'Intel i9', price: 599.99 }])
  .select()
  .single();
```

### 关联查询

```typescript
const { data, error } = await supabase
  .from('package_items')
  .select(`
    id,
    quantity,
    products (
      name,
      price,
      category
    )
  `)
  .eq('package_id', 1);
```

## 🔧 故障排除

### 问题: 无法连接到数据库

**解决方案**:

- 检查 Supabase 项目是否处于活动状态
- 验证 `SUPABASE_ANON_KEY` 是否正确
- 确保已运行 `schema.sql` 创建表

### 问题: RLS 策略阻止访问

**解决方案**:

- 确保已运行 `setup-rls.sql`
- 在开发环境可以暂时禁用 RLS (不推荐)
- 检查策略是否正确配置

### 问题: 外键约束错误

**解决方案**:

- 确保 `schema.sql` 按顺序执行
- 先创建父表 (products, packages) 再创建子表 (package_items)

## 📚 更多资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase JavaScript SDK](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security 指南](https://supabase.com/docs/guides/auth/row-level-security)

## 🎉 完成!

现在你的应用已经完全切换到 Supabase 官方 SDK,享受更好的开发体验吧!
