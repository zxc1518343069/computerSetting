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

CREATE TABLE IF NOT EXISTS after_sales_service_categories
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT NOT NULL CHECK (name <> ''),
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_after_sales_categories_active_sort
    ON after_sales_service_categories(is_active, sort_order);

CREATE TABLE IF NOT EXISTS after_sales_services
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    category_id INTEGER NOT NULL REFERENCES after_sales_service_categories(id),
    name TEXT NOT NULL CHECK (name <> ''),
    description TEXT,
    price_type TEXT NOT NULL DEFAULT 'fixed'
        CHECK (price_type IN ('fixed', 'range', 'multi', 'custom')),
    price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
    price_label TEXT NOT NULL DEFAULT '',
    unit TEXT,
    includes TEXT,
    excludes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_after_sales_services_category_sort
    ON after_sales_services(category_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS after_sales_service_notices
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    content TEXT NOT NULL CHECK (content <> ''),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_after_sales_notices_active_sort
    ON after_sales_service_notices(is_active, sort_order);

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

CREATE TABLE IF NOT EXISTS logistics_companies
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    contact TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logistics_companies_status
    ON logistics_companies(status);

CREATE TABLE IF NOT EXISTS logistics_records
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'manual',
    company_id INTEGER REFERENCES logistics_companies (id),
    tracking_no TEXT,
    shipping_fee_cents INTEGER NOT NULL DEFAULT 0,
    self_amount_cents INTEGER NOT NULL DEFAULT 0,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    related_type TEXT,
    related_id INTEGER,
    shipping_fee_bearer TEXT NOT NULL DEFAULT 'self',
    settlement_target TEXT NOT NULL DEFAULT 'logistics_company',
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    paid_at TEXT,
    payment_account TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logistics_records_company_status
    ON logistics_records(company_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_logistics_records_type_time
    ON logistics_records(type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_logistics_records_related
    ON logistics_records(related_type, related_id);

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
    logistics_company_id INTEGER REFERENCES logistics_companies (id),
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

CREATE TABLE IF NOT EXISTS purchase_merchant_refunds
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders (id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers (id),
    type TEXT NOT NULL CHECK (type IN ('rebate', 'price_protection')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'partial_settled', 'settled', 'voided')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    settled_amount_cents INTEGER NOT NULL DEFAULT 0,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    note TEXT,
    voided_at TEXT,
    void_reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_merchant_refunds_order_status
    ON purchase_merchant_refunds(purchase_order_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_merchant_refunds_supplier_status
    ON purchase_merchant_refunds(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_merchant_refunds_type_time
    ON purchase_merchant_refunds(type, occurred_at);

CREATE TABLE IF NOT EXISTS purchase_merchant_refund_items
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_refund_id INTEGER NOT NULL REFERENCES purchase_merchant_refunds (id) ON DELETE CASCADE,
    purchase_order_item_id INTEGER REFERENCES purchase_order_items (id),
    inbound_order_item_id INTEGER REFERENCES inbound_order_items (id),
    product_id INTEGER REFERENCES products (id),
    quantity INTEGER NOT NULL DEFAULT 0,
    original_unit_cost_cents INTEGER,
    adjusted_unit_cost_cents INTEGER,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_merchant_refund_items_refund
    ON purchase_merchant_refund_items(merchant_refund_id);
CREATE INDEX IF NOT EXISTS idx_purchase_merchant_refund_items_order_item
    ON purchase_merchant_refund_items(purchase_order_item_id);

CREATE TABLE IF NOT EXISTS purchase_merchant_refund_inventory_items
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_refund_item_id INTEGER NOT NULL
        REFERENCES purchase_merchant_refund_items (id) ON DELETE CASCADE,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items (id),
    inventory_status_at_adjustment TEXT NOT NULL,
    order_inventory_item_id INTEGER REFERENCES order_inventory_items (id),
    sales_order_id INTEGER REFERENCES sales_orders (id),
    old_cost_price_cents INTEGER NOT NULL,
    new_cost_price_cents INTEGER NOT NULL,
    old_order_cost_price_cents INTEGER,
    new_order_cost_price_cents INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_merchant_refund_inventory_items_item
    ON purchase_merchant_refund_inventory_items(inventory_item_id);

CREATE TABLE IF NOT EXISTS purchase_merchant_refund_settlements
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_refund_id INTEGER NOT NULL REFERENCES purchase_merchant_refunds (id) ON DELETE CASCADE,
    settlement_type TEXT NOT NULL CHECK (settlement_type IN ('cash', 'payable_offset')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    account TEXT,
    settled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    voided_at TEXT,
    void_reason TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_merchant_refund_settlements_refund_status
    ON purchase_merchant_refund_settlements(merchant_refund_id, status);

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
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    delivery_status TEXT NOT NULL DEFAULT 'undelivered',
    source_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('diy', 'retail', 'after_sales', 'manual')),
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
    delivered_at TEXT,
    cancelled_at TEXT,
    cancelled_by_user_id INTEGER,
    cancelled_by_username TEXT,
    cancel_reason TEXT,
    refunded_at TEXT,
    refunded_by_user_id INTEGER,
    refunded_by_username TEXT,
    refund_note TEXT,
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
CREATE INDEX IF NOT EXISTS idx_sales_orders_payment_status ON sales_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_delivery_status ON sales_orders(delivery_status);

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

CREATE TABLE IF NOT EXISTS sales_order_after_sales_details
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE REFERENCES sales_orders(id) ON DELETE CASCADE,
    device_model TEXT,
    fault_description TEXT,
    service_note TEXT,
    completed_note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_order_after_sales_details_order_id
    ON sales_order_after_sales_details(order_id);

CREATE TABLE IF NOT EXISTS sales_order_after_sales_items
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES after_sales_services(id),
    service_name TEXT NOT NULL,
    service_category_name TEXT,
    price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'range', 'multi', 'custom')),
    price_label TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    sale_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (sale_price_cents >= 0),
    total_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_price_cents >= 0),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_order_after_sales_items_order_id
    ON sales_order_after_sales_items(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_after_sales_items_service_id
    ON sales_order_after_sales_items(service_id);

CREATE TABLE IF NOT EXISTS sales_order_after_sales_adjustments
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    previous_final_amount_cents INTEGER NOT NULL DEFAULT 0,
    final_amount_cents INTEGER NOT NULL DEFAULT 0,
    adjustment_note TEXT NOT NULL,
    created_by_user_id INTEGER,
    created_by_username TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_order_after_sales_adjustments_order_created
    ON sales_order_after_sales_adjustments(order_id, created_at);

CREATE TABLE IF NOT EXISTS sales_order_after_sales_adjustment_items
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_id INTEGER NOT NULL REFERENCES sales_order_after_sales_adjustments(id) ON DELETE CASCADE,
    source_service_item_id INTEGER REFERENCES sales_order_after_sales_items(id) ON DELETE SET NULL,
    service_id INTEGER REFERENCES after_sales_services(id),
    service_name TEXT NOT NULL,
    service_category_name TEXT,
    price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'range', 'multi', 'custom')),
    price_label TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    sale_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (sale_price_cents >= 0),
    total_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_price_cents >= 0),
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_order_after_sales_adjustment_items_adjustment
    ON sales_order_after_sales_adjustment_items(adjustment_id);

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
