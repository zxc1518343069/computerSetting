-- ====================================
-- 电脑配件报价系统 - 数据库表结构
-- ====================================
-- 核心三表: 配件表、套餐表、溢价配置表

-- 1. 溢价配置表
-- 用于配置各类配件的加价比例
CREATE TABLE IF NOT EXISTS pricing_config
(
    id
    SERIAL
    PRIMARY
    KEY,
    unified_pricing
    BOOLEAN
    NOT
    NULL
    DEFAULT
    true, -- 是否使用统一加价
    unified_rate
    DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0, -- 统一加价比例 (%)
    cpu_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0, -- CPU 加价比例 (%)
    motherboard_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0, -- 主板加价比例 (%)
    ram_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0, -- 内存加价比例 (%)
    gpu_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0, -- 显卡加价比例 (%)
    storage_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0, -- 硬盘加价比例 (%)
    psu_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0, -- 电源加价比例 (%)
    case_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0, -- 机箱加价比例 (%)
    cooling_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0, -- 散热加价比例 (%)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- 2. 配件表
-- 存储所有配件信息，按类别分类
CREATE TABLE IF NOT EXISTS products
(
    id
    SERIAL
    PRIMARY
    KEY,
    category
    VARCHAR
(
    50
) NOT NULL, -- 类别: cpu, motherboard, ram, gpu, storage, psu, case, cooling
    name VARCHAR
(
    255
) NOT NULL, -- 配件名称
    price DECIMAL
(
    10,
    2
) NOT NULL, -- 配件价格
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- 3. 套餐表
-- 存储配件组合套餐
CREATE TABLE IF NOT EXISTS packages
(
    id
    SERIAL
    PRIMARY
    KEY,
    name
    VARCHAR
(
    255
) NOT NULL, -- 套餐名称
    description TEXT, -- 套餐描述
    total_price DECIMAL
(
    10,
    2
), -- 总价（可为空，前端计算）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- 4. 套餐配件关联表
-- 记录套餐中包含的配件及数量
CREATE TABLE IF NOT EXISTS package_items
(
    id
    SERIAL
    PRIMARY
    KEY,
    package_id
    INTEGER
    NOT
    NULL
    REFERENCES
    packages
(
    id
) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products
(
    id
)
  ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1, -- 配件数量
    created_at TIMESTAMP
  WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

-- ====================================
-- 创建索引提升查询性能
-- ====================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_product_id ON package_items(product_id);

-- ====================================
-- 插入默认数据
-- ====================================

-- 插入默认溢价配置（零加价）
INSERT INTO pricing_config (unified_pricing, unified_rate, cpu_rate, motherboard_rate, ram_rate, gpu_rate, storage_rate,
                            psu_rate, case_rate, cooling_rate)
VALUES (true, 0, 0, 0, 0, 0, 0, 0, 0, 0) ON CONFLICT DO NOTHING;

-- 插入默认产品数据
INSERT INTO products (category, name, price)
VALUES
-- CPU
('cpu', 'Intel Core i9-13900K', 589.99),
('cpu', 'AMD Ryzen 9 7950X', 549.99),
('cpu', 'Intel Core i7-13700K', 419.99),

-- Motherboard
('motherboard', 'ASUS ROG Maximus Z790 Hero', 599.99),
('motherboard', 'MSI MEG X670E ACE', 499.99),
('motherboard', 'Gigabyte B650 AORUS Elite AX', 229.99),

-- RAM
('ram', 'Corsair Dominator Platinum RGB 32GB DDR5 6000MHz', 249.99),
('ram', 'G.Skill Trident Z5 RGB 32GB DDR5 6000MHz', 219.99),
('ram', 'Kingston Fury Beast 32GB DDR5 5200MHz', 149.99),

-- GPU
('gpu', 'NVIDIA GeForce RTX 4090 Founders Edition', 1599.99),
('gpu', 'AMD Radeon RX 7900 XTX', 999.99),
('gpu', 'NVIDIA GeForce RTX 4080', 1199.99),

-- Storage
('storage', 'Samsung 990 Pro 2TB NVMe SSD', 249.99),
('storage', 'WD Black SN850X 2TB NVMe SSD', 229.99),
('storage', 'Crucial P5 Plus 2TB NVMe SSD', 199.99),

-- PSU
('psu', 'Corsair HX1200 Platinum 1200W', 299.99),
('psu', 'Seasonic PRIME TX-1000 1000W', 279.99),
('psu', 'EVGA SuperNOVA 850 G6 850W', 159.99),

-- Case
('case', 'Lian Li PC-O11 Dynamic', 149.99),
('case', 'Fractal Design Torrent', 199.99),
('case', 'NZXT H7 Flow', 129.99),

-- Cooling
('cooling', 'NZXT Kraken Z73 RGB 360mm', 279.99),
('cooling', 'Corsair iCUE H150i ELITE LCD', 249.99),
('cooling', 'Noctua NH-D15 chromax.black', 109.99) ON CONFLICT DO NOTHING;
