-- ====================================
-- Supabase RLS (Row Level Security) 配置
-- ====================================
-- 在 Supabase Dashboard -> SQL Editor 中运行此脚本
--
-- 说明: 由于这是个人工具,无需复杂的权限控制
-- 所有表都允许公开访问（通过 anon key）

-- 1. 启用 RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- 2. 配件表策略 - 允许所有操作
CREATE
POLICY "Allow all operations on products"
ON products
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. 套餐表策略 - 允许所有操作
CREATE
POLICY "Allow all operations on packages"
ON packages
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. 套餐配件关联表策略 - 允许所有操作
CREATE
POLICY "Allow all operations on package_items"
ON package_items
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. 溢价配置表策略 - 允许所有操作
CREATE
POLICY "Allow all operations on pricing_config"
ON pricing_config
FOR ALL
USING (true)
WITH CHECK (true);

-- ====================================
-- 说明
-- ====================================
-- 以上策略允许通过 anon key 完全访问数据库
-- 适合个人工具使用
--
-- 如果将来需要添加认证,可以修改策略为:
-- USING (auth.role() = 'authenticated')
