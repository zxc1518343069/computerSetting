-- 同步 products 表结构，添加缺失字段
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS selling_price DECIMAL (10, 2);
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_use_premium BOOLEAN DEFAULT true;
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 如果需要，也可以同步 pricing_config 表（确保 monitor_rate 存在）
ALTER TABLE pricing_config
    ADD COLUMN IF NOT EXISTS monitor_rate DECIMAL (5, 2) NOT NULL DEFAULT 0;
ALTER TABLE pricing_config
    ADD COLUMN IF NOT EXISTS rounding_type VARCHAR (20) NOT NULL DEFAULT 'none';
