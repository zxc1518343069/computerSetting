-- 创建数据库
-- CREATE DATABASE computer_parts;

-- 溢价配置表
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
    true,
    unified_rate
    DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0,
    cpu_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0,
    motherboard_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0,
    ram_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0,
    gpu_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0,
    storage_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0,
    psu_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0,
    case_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0,
    cooling_rate DECIMAL
(
    5,
    2
) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- 配件配置表
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
) NOT NULL,
    name VARCHAR
(
    255
) NOT NULL,
    price DECIMAL
(
    10,
    2
) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- 配件套餐表
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
) NOT NULL,
    description TEXT,
    total_price DECIMAL
(
    10,
    2
),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- 套餐配件关联表
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
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP
  WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

-- 管理员用户表
CREATE TABLE IF NOT EXISTS admin_users
(
    id
    SERIAL
    PRIMARY
    KEY,
    username
    VARCHAR
(
    50
) UNIQUE NOT NULL,
    password_hash VARCHAR
(
    255
) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_product_id ON package_items(product_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- 插入默认溢价配置
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

-- 插入默认管理员账户 (密码: wangman)
-- 注意: 实际使用时需要通过API创建，这里的密码hash是 bcrypt 加密的 'wangman'
INSERT INTO admin_users (username, password_hash)
VALUES ('yangshuhao', '$2a$10$YourHashedPasswordHere') ON CONFLICT (username) DO NOTHING;
