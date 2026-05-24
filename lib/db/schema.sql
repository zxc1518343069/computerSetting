PRAGMA
foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pricing_config
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    unified_pricing
    INTEGER
    NOT
    NULL
    DEFAULT
    1,
    unified_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    rounding_type
    TEXT
    NOT
    NULL
    DEFAULT
    'none',
    cpu_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    motherboard_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    ram_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    gpu_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    storage_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    psu_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    case_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    cooling_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    monitor_rate
    REAL
    NOT
    NULL
    DEFAULT
    0,
    created_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP,
    updated_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    category
    TEXT
    NOT
    NULL,
    name
    TEXT
    NOT
    NULL,
    price_cents
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    stock_quantity
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    selling_price_cents
    INTEGER,
    is_use_premium
    INTEGER
    NOT
    NULL
    DEFAULT
    1,
    created_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP,
    updated_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS packages
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    name
    TEXT
    NOT
    NULL,
    description
    TEXT,
    total_price_cents
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    created_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP,
    updated_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS package_items
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
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
),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_package_items_package_id ON package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_product_id ON package_items(product_id);

CREATE TABLE IF NOT EXISTS suppliers
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    name
    TEXT
    NOT
    NULL,
    contact_name
    TEXT,
    phone
    TEXT,
    address
    TEXT,
    note
    TEXT,
    created_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP,
    updated_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inbound_orders
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    supplier_id
    INTEGER
    NOT
    NULL
    REFERENCES
    suppliers
(
    id
),
    shipping_fee_cents INTEGER NOT NULL DEFAULT 0,
    misc_fee_cents INTEGER NOT NULL DEFAULT 0,
    is_paid INTEGER NOT NULL DEFAULT 0,
    inbound_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS inbound_order_items
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    inbound_order_id
    INTEGER
    NOT
    NULL
    REFERENCES
    inbound_orders
(
    id
) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products
(
    id
),
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_price_cents INTEGER NOT NULL DEFAULT 0,
    warranty_enabled INTEGER NOT NULL DEFAULT 0,
    warranty_until TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS inventory_items
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    product_id
    INTEGER
    NOT
    NULL
    REFERENCES
    products
(
    id
),
    supplier_id INTEGER REFERENCES suppliers
(
    id
),
    inbound_order_id INTEGER REFERENCES inbound_orders
(
    id
),
    inbound_order_item_id INTEGER REFERENCES inbound_order_items
(
    id
),
    cost_price_cents INTEGER NOT NULL DEFAULT 0,
    serial_number TEXT UNIQUE,
    warranty_enabled INTEGER NOT NULL DEFAULT 0,
    warranty_until TEXT,
    inbound_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'in_stock',
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_inventory_items_product_status ON inventory_items(product_id, status);

CREATE TABLE IF NOT EXISTS sales_orders
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    order_no
    TEXT
    NOT
    NULL
    UNIQUE,
    customer_name
    TEXT
    NOT
    NULL,
    customer_phone
    TEXT,
    original_amount_cents
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    final_amount_cents
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    discount_amount_cents
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    cost_amount_cents
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    profit_amount_cents
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    status
    TEXT
    NOT
    NULL
    DEFAULT
    'pending',
    is_paid
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    source
    TEXT,
    note
    TEXT,
    sold_at
    TEXT,
    created_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP,
    updated_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);

CREATE TABLE IF NOT EXISTS sales_order_items
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    order_id
    INTEGER
    NOT
    NULL
    REFERENCES
    sales_orders
(
    id
) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products
(
    id
),
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    cost_price_cents INTEGER,
    sale_price_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS order_inventory_items
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    order_id
    INTEGER
    NOT
    NULL
    REFERENCES
    sales_orders
(
    id
) ON DELETE CASCADE,
    order_item_id INTEGER NOT NULL REFERENCES sales_order_items
(
    id
)
  ON DELETE CASCADE,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items
(
    id
),
    cost_price_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS operating_costs
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    type
    TEXT
    NOT
    NULL,
    name
    TEXT
    NOT
    NULL,
    amount_cents
    INTEGER
    NOT
    NULL
    DEFAULT
    0,
    cost_date
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_DATE,
    note
    TEXT,
    created_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP,
    updated_at
    TEXT
    NOT
    NULL
    DEFAULT
    CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operating_costs_type_date ON operating_costs(type, cost_date);

INSERT INTO pricing_config (id,
                            unified_pricing,
                            unified_rate,
                            rounding_type,
                            cpu_rate,
                            motherboard_rate,
                            ram_rate,
                            gpu_rate,
                            storage_rate,
                            psu_rate,
                            case_rate,
                            cooling_rate,
                            monitor_rate)
SELECT 1,
       1,
       0,
       'none',
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0,
       0 WHERE NOT EXISTS (SELECT 1 FROM pricing_config WHERE id = 1);
