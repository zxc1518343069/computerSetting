export interface Product {
    id: number;
    category_id?: number | null;
    category: string;
    category_name?: string | null;
    category_label?: string | null;
    category_tag_color?: string | null;
    name: string;
    barcode?: string | null;
    price: number;
    stock_quantity?: number;
    inventory_summary?: {
        in_stock: number;
        min_cost_price: number | null;
        max_cost_price: number | null;
    };
    selling_price?: number | null;
    is_use_premium?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ProductCategory {
    id: number;
    code?: string | null;
    name: string;
    label: string;
    tag_color: string;
    sort_order: number;
    is_active: boolean;
    product_count?: number;
    pricing_rate_id?: number | null;
    pricing_rate?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface PricingConfig {
    id?: number;
    unifiedPricing: boolean;
    unifiedRate: number;
    roundingType: 'none' | 'integer' | 'ten';
    categoryRates: Record<number, number>;
    rates?: Array<{
        id: number;
        categoryId: number;
        categoryCode?: string | null;
        categoryName: string;
        categoryLabel: string;
        tagColor: string;
        sortOrder: number;
        isActive: boolean;
        rate: number;
    }>;
    // Legacy fixed-rate fields kept temporarily while older code is being retired.
    cpu?: number;
    motherboard?: number;
    ram?: number;
    gpu?: number;
    storage?: number;
    psu?: number;
    case?: number;
    cooling?: number;
    monitor?: number;
    created_at?: string;
    updated_at?: string;
}

// 兼容旧代码的别名
export type PricingConfigFrontend = PricingConfig;

export interface Package {
    id: number;
    name: string;
    description?: string;
    total_price: number;
    items: PackageItem[];
    created_at: string;
    updated_at: string;
}

export interface PackageItem {
    id?: number;
    package_id?: number;
    product_id: number;
    quantity: number;
    product_name: string;
    product_price: number;
    product_category: string;
    custom_name?: string;
    custom_price?: number;
    created_at?: string;
}

export interface Supplier {
    id: number;
    name: string;
    contact_name?: string | null;
    phone?: string | null;
    address?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Customer {
    id: number;
    name: string;
    phone: string;
    wechat?: string | null;
    address?: string | null;
    note?: string | null;
    order_count?: number;
    receivable_amount?: number;
    latest_order_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface InventoryItem {
    id: number;
    product_id: number;
    supplier_id?: number | null;
    supplier_name?: string | null;
    inbound_order_id?: number | null;
    inbound_order_item_id?: number | null;
    cost_price: number;
    serial_number?: string | null;
    warranty_enabled?: boolean;
    warranty_until?: string | null;
    inbound_at?: string;
    status: 'in_stock' | 'sold' | 'returned';
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    product?: Product;
}

export interface InboundOrder {
    id: number;
    supplier_id: number;
    shipping_fee: number;
    misc_fee: number;
    is_paid: boolean;
    source_type?: 'purchase_order' | 'opening_stock';
    purchase_order_id?: number | null;
    status?: 'draft' | 'completed' | 'cancelled';
    inbound_at: string;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    supplier?: Supplier;
    items?: InboundOrderItem[];
    summary: {
        inbound_quantity: number;
        sold_quantity: number;
        in_stock_quantity: number;
        returned_quantity: number;
        returnable_quantity: number;
        goods_amount: number;
        record_status: 'inbound' | 'partial_returned' | 'returned';
    };
}

export interface InboundOrderItem {
    id: number;
    inbound_order_id: number;
    product_id: number;
    purchase_order_item_id?: number | null;
    quantity: number;
    purchase_price: number;
    serial_tracking_enabled?: boolean;
    warranty_enabled?: boolean;
    warranty_until?: string | null;
    note?: string | null;
    created_at?: string;
    product?: Product;
    inventory_items?: InventoryItem[];
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partial_inbound' | 'inbound' | 'cancelled';

export type PurchasePaymentStatus = 'active' | 'voided';

export interface PurchasePayment {
    id: number;
    purchase_order_id: number;
    amount: number;
    payment_account?: string | null;
    paid_at: string;
    status: PurchasePaymentStatus;
    voided_at?: string | null;
    void_reason?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface PurchaseReturnItem {
    id: number;
    purchase_return_id: number;
    purchase_order_item_id?: number | null;
    inbound_order_item_id?: number | null;
    inventory_item_id?: number | null;
    product_id: number;
    purchase_price: number;
    created_at?: string;
    product?: Product;
}

export interface PurchaseReturn {
    id: number;
    purchase_order_id: number;
    inbound_order_id: number;
    type: 'return' | 'exchange';
    reason: string;
    status: 'completed' | 'cancelled';
    goods_status: 'pending_shipment' | 'shipped' | 'merchant_received' | 'cancelled';
    shipping_fee: number;
    shipping_fee_bearer: 'self' | 'merchant' | 'shared';
    self_shipping_fee: number;
    merchant_shipping_fee: number;
    logistics_company?: string | null;
    tracking_no?: string | null;
    shipped_at?: string | null;
    merchant_received_at?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
    note?: string | null;
    amount: number;
    receivable_amount: number;
    refunded_amount: number;
    pending_refund: number;
    refund_status: 'unrefunded' | 'partial_refunded' | 'refunded';
    item_count: number;
    created_at?: string;
    updated_at?: string;
    supplier?: Supplier;
    items?: PurchaseReturnItem[];
    refunds?: PurchaseRefund[];
}

export interface PurchaseRefund {
    id: number;
    purchase_order_id: number;
    purchase_return_id?: number | null;
    amount: number;
    refund_account?: string | null;
    refunded_at: string;
    status: PurchasePaymentStatus;
    voided_at?: string | null;
    void_reason?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface PurchaseOrderSummary {
    line_count: number;
    total_ordered_quantity: number;
    total_received_quantity: number;
    total_remaining_quantity: number;
    goods_amount: number;
    return_amount: number;
    payable_amount: number;
    paid_amount: number;
    refunded_amount: number;
    net_paid: number;
    pending_payment: number;
    pending_refund: number;
    payment_status: 'unpaid' | 'partial_paid' | 'settled';
}

export interface PurchaseOrderItem {
    id: number;
    purchase_order_id: number;
    product_id: number;
    ordered_quantity: number;
    received_quantity: number;
    remaining_quantity: number;
    purchase_price: number;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    product?: Product;
}

export interface PurchaseOrder {
    id: number;
    supplier_id: number;
    status: PurchaseOrderStatus;
    ordered_at: string;
    expected_inbound_at?: string | null;
    shipping_fee: number;
    misc_fee: number;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    supplier?: Supplier;
    items: PurchaseOrderItem[];
    payments?: PurchasePayment[];
    returns?: PurchaseReturn[];
    refunds?: PurchaseRefund[];
    inbound_orders?: InboundOrder[];
    summary: PurchaseOrderSummary;
}

export interface SalesOrder {
    id: number;
    order_no: string;
    customer_id?: number | null;
    customer_name: string;
    customer_phone?: string | null;
    customer?: Customer | null;
    original_amount: number;
    final_amount: number;
    discount_amount: number;
    cost_amount: number;
    profit_amount: number;
    status: 'pending' | 'completed' | 'cancelled';
    is_paid?: boolean;
    source?: string | null;
    created_by_user_id?: number | null;
    created_by_username?: string | null;
    latest_adjustment_id?: number | null;
    latest_adjustment?: SalesOrderAdjustment | null;
    latest_adjustment_items?: SalesOrderAdjustmentItem[];
    adjustment_history?: SalesOrderAdjustment[];
    original_items?: SalesOrderItem[];
    adjusted_amount?: number | null;
    adjustment_note?: string | null;
    adjusted_at?: string | null;
    adjusted_by_username?: string | null;
    note?: string | null;
    sold_at?: string | null;
    created_at?: string;
    updated_at?: string;
    items?: OrderSettlementItem[];
}

export type OrderSettlementItem = SalesOrderItem | SalesOrderAdjustmentItem;

export interface SalesOrderItem {
    id: number;
    order_id: number;
    product_id: number;
    product_name: string;
    product_category: string;
    quantity: number;
    cost_price?: number | null;
    sale_price: number;
    source_type?: 'order_item';
    created_at?: string;
    product?: Product;
    inventory_bindings?: OrderInventoryItem[];
}

export interface SalesOrderAdjustment {
    id: number;
    order_id: number;
    previous_adjustment_id?: number | null;
    original_amount: number;
    previous_adjusted_amount: number;
    adjusted_amount: number;
    previous_final_amount: number;
    final_amount: number;
    adjustment_note: string;
    created_by_user_id?: number | null;
    created_by_username?: string | null;
    created_at?: string;
}

export interface SalesOrderAdjustmentItem {
    id: number;
    adjustment_id: number;
    order_id?: number;
    source_order_item_id?: number | null;
    product_id: number;
    product_name: string;
    product_category: string;
    quantity: number;
    sale_price: number;
    source_type: 'adjustment_item';
    created_at?: string;
    product?: Product;
    inventory_bindings?: OrderInventoryItem[];
}

export interface OrderInventoryItem {
    id: number;
    order_id: number;
    order_item_id?: number | null;
    adjustment_item_id?: number | null;
    inventory_item_id: number;
    cost_price: number;
    created_at?: string;
    inventory_item?: InventoryItem;
}

export interface OperatingCost {
    id: number;
    type: 'rent' | 'salary' | 'utilities' | 'misc' | 'shipping' | 'purchase_misc';
    name: string;
    amount: number;
    cost_date: string;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

export type AdminRole = 'admin' | 'staff';
export type AdminUserStatus = 'active' | 'disabled';

export interface AdminUser {
    id: number;
    username: string;
    role: AdminRole;
    status: AdminUserStatus;
    last_login_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Game {
    id: string | number;
    name: string;
    icon: string;
    type: 'online' | 'single';
}

// 带category字段的Product接口 (兼容旧代码)
export interface ProductWithCategory extends Product {
    category: string;
}
