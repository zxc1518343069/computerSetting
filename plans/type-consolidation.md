# 类型统一与数据库同步方案

## 1. 现状分析

目前项目中存在两处主要的类型定义冲突：

- `@/const/types.ts`: 前端主要使用的类型，部分字段缺失（如 `updated_at`），且 `PricingConfig` 使用的是 camelCase。
- `lib/supabase.ts`: 包含了一套与数据库结构更接近的类型定义（snake_case），但与前端代码不统一，且存在冗余。

用户反馈 `Product` 类型中的 `selling_price` 和 `is_use_premium` 字段未同步到数据库，导致功能不可用。

## 2. 目标

- 将所有数据库相关的类型定义统一到 `@/const/types.ts`。
- 移除 `lib/supabase.ts` 中的冗余定义。
- 确保 `Product` 类型包含所有数据库字段，并提供 SQL 脚本确保数据库表结构同步。
- 统一 `PricingConfig` 的处理逻辑。

## 3. 实施步骤

### 步骤 1: 更新 `@/const/types.ts`

将所有模型统一到此处，并确保字段完整。

```typescript
// @/const/types.ts

export interface Product {
    id: number;
    category: string;
    name: string;
    price: number;
    selling_price?: number | null;
    is_use_premium?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PricingConfig {
    id?: number;
    unified_pricing: boolean;
    unified_rate: number;
    rounding_type: 'none' | 'integer' | 'ten';
    cpu_rate: number;
    motherboard_rate: number;
    ram_rate: number;
    gpu_rate: number;
    storage_rate: number;
    psu_rate: number;
    case_rate: number;
    cooling_rate: number;
    monitor_rate: number;
    created_at?: string;
    updated_at?: string;
}

// 为了兼容前端现有的 camelCase 代码，可以保留一个转换后的接口或在 API 层处理
export interface PricingConfigFrontend {
    unifiedPricing: boolean;
    unifiedRate: number;
    roundingType: 'none' | 'integer' | 'ten';
    cpu: number;
    motherboard: number;
    ram: number;
    gpu: number;
    storage: number;
    psu: number;
    case: number;
    cooling: number;
    monitor: number;
}

export interface Package {
    id: number;
    name: string;
    description?: string;
    total_price: number;
    created_at?: string;
    updated_at?: string;
}

export interface PackageItem {
    id: number;
    package_id: number;
    product_id: number;
    quantity: number;
    created_at?: string;
}

export interface AdminUser {
    id: number;
    username: string;
    password_hash: string;
    created_at?: string;
    updated_at?: string;
}
```

### 步骤 2: 修改 `lib/supabase.ts`

移除内部类型定义，改为从 `@/const/types.ts` 导入。

### 步骤 3: 数据库同步 (SQL)

如果数据库中确实缺失字段，需要执行以下 SQL：

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_use_premium BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
```

### 步骤 4: 修复 API 路由

确保 `app/api/pricing/route.ts` 等地方的映射逻辑正确处理 snake_case 和 camelCase 的转换（如果决定在前端保留 camelCase）。

## 4. 待确认事项

- 是否需要将前端所有的 `PricingConfig` 引用都改为 snake_case？（建议在 API 层做转换，保持前端代码整洁）。
- `AdminUser` 表是否已经在数据库中创建？

## 5. 任务清单

- [ ] 更新 `@/const/types.ts`
- [ ] 修改 `lib/supabase.ts`
- [ ] 检查并更新所有引用 `Product` 的地方
- [ ] 检查并更新 `PricingCalculator` 以支持新的类型定义
- [ ] 提供数据库迁移 SQL
