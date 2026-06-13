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

CREATE TABLE IF NOT EXISTS product_categories
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    tag_color TEXT NOT NULL DEFAULT 'blue',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_categories_active_sort
    ON product_categories(is_active, sort_order);

CREATE TABLE IF NOT EXISTS category_pricing_rates
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL UNIQUE REFERENCES product_categories(id),
    rate REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role_status
    ON admin_users(role, status);

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
    category_id
    INTEGER
    REFERENCES
    product_categories
(
    id
),
    name
    TEXT
    NOT
    NULL,
    barcode
    TEXT,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)
    WHERE barcode IS NOT NULL AND barcode <> '';

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

CREATE TABLE IF NOT EXISTS purchase_orders
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers (id),
    status TEXT NOT NULL DEFAULT 'draft',
    ordered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_inbound_at TEXT,
    shipping_fee_cents INTEGER NOT NULL DEFAULT 0,
    misc_fee_cents INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_status
    ON purchase_orders(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_ordered_at ON purchase_orders(ordered_at);

CREATE TABLE IF NOT EXISTS purchase_order_items
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products (id),
    ordered_quantity INTEGER NOT NULL DEFAULT 1,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    purchase_price_cents INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id
    ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id
    ON purchase_order_items(product_id);

CREATE TABLE IF NOT EXISTS purchase_payments
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    payment_account TEXT,
    paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'active',
    voided_at TEXT,
    void_reason TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (amount_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_payments_order_status
    ON purchase_payments(purchase_order_id, status);

CREATE TABLE IF NOT EXISTS purchase_returns
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders (id),
    inbound_order_id INTEGER REFERENCES inbound_orders (id),
    type TEXT NOT NULL DEFAULT 'return',
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    goods_status TEXT NOT NULL DEFAULT 'pending_shipment',
    shipping_fee_cents INTEGER NOT NULL DEFAULT 0,
    shipping_fee_bearer TEXT NOT NULL DEFAULT 'self',
    self_shipping_fee_cents INTEGER NOT NULL DEFAULT 0,
    merchant_shipping_fee_cents INTEGER NOT NULL DEFAULT 0,
    logistics_company TEXT,
    tracking_no TEXT,
    shipped_at TEXT,
    merchant_received_at TEXT,
    cancelled_at TEXT,
    cancel_reason TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_order_id
    ON purchase_returns(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_inbound_id
    ON purchase_returns(inbound_order_id);

CREATE TABLE IF NOT EXISTS purchase_return_items
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_return_id INTEGER NOT NULL REFERENCES purchase_returns (id) ON DELETE CASCADE,
    purchase_order_item_id INTEGER REFERENCES purchase_order_items (id),
    inbound_order_item_id INTEGER REFERENCES inbound_order_items (id),
    inventory_item_id INTEGER REFERENCES inventory_items (id),
    product_id INTEGER NOT NULL REFERENCES products (id),
    purchase_price_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return_id
    ON purchase_return_items(purchase_return_id);

CREATE TABLE IF NOT EXISTS purchase_refunds
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
    purchase_return_id INTEGER REFERENCES purchase_returns (id),
    amount_cents INTEGER NOT NULL,
    refund_account TEXT,
    refunded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'active',
    voided_at TEXT,
    void_reason TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (amount_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_refunds_order_status
    ON purchase_refunds(purchase_order_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_refunds_return_status
    ON purchase_refunds(purchase_return_id, status);

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
    source_type TEXT NOT NULL DEFAULT 'opening_stock',
    purchase_order_id INTEGER REFERENCES purchase_orders (id),
    status TEXT NOT NULL DEFAULT 'completed',
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
    purchase_order_item_id INTEGER REFERENCES purchase_order_items (id),
    serial_tracking_enabled INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS customers
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL CHECK (phone <> ''),
    wechat TEXT,
    address TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_name_phone
    ON customers(name, phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique
    ON customers(phone);

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
    customer_id
    INTEGER
    REFERENCES
    customers
(
    id
),
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
    created_by_user_id
    INTEGER,
    created_by_username
    TEXT,
    latest_adjustment_id
    INTEGER,
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

CREATE TABLE IF NOT EXISTS sales_order_adjustments
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
    previous_adjustment_id INTEGER REFERENCES sales_order_adjustments
(
    id
),
    original_amount_cents INTEGER NOT NULL DEFAULT 0,
    previous_adjusted_amount_cents INTEGER NOT NULL DEFAULT 0,
    adjusted_amount_cents INTEGER NOT NULL DEFAULT 0,
    previous_final_amount_cents INTEGER NOT NULL DEFAULT 0,
    final_amount_cents INTEGER NOT NULL DEFAULT 0,
    adjustment_note TEXT NOT NULL,
    created_by_user_id INTEGER,
    created_by_username TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_sales_order_adjustments_order_created
    ON sales_order_adjustments(order_id, created_at);

CREATE TABLE IF NOT EXISTS sales_order_adjustment_items
(
    id
    INTEGER
    PRIMARY
    KEY
    AUTOINCREMENT,
    adjustment_id
    INTEGER
    NOT
    NULL
    REFERENCES
    sales_order_adjustments
(
    id
) ON DELETE CASCADE,
    source_order_item_id INTEGER REFERENCES sales_order_items
(
    id
)
  ON DELETE SET NULL,
    product_id INTEGER NOT NULL REFERENCES products
(
    id
),
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    sale_price_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_sales_order_adjustment_items_adjustment
    ON sales_order_adjustment_items(adjustment_id);

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
    order_item_id INTEGER REFERENCES sales_order_items
(
    id
)
  ON DELETE CASCADE,
    adjustment_item_id INTEGER REFERENCES sales_order_adjustment_items
(
    id
)
  ON DELETE CASCADE,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items
(
    id
),
    cost_price_cents INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (order_item_id IS NOT NULL AND adjustment_item_id IS NULL)
        OR
        (order_item_id IS NULL AND adjustment_item_id IS NOT NULL)
        )
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
