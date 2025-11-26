export interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
}

export interface EditablePartRow {
    id: string;
    category: string;
    product_id: number;
    quantity: number;
    custom_name?: string;
    custom_price?: number;
}

export interface PricingConfigData {
    unifiedPricing: boolean;
    unifiedRate: number;
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

export interface EditablePackageTableProps {
    items: EditablePartRow[];
    onProductChange: (id: string, productId: number) => void;
    onQuantityChange: (id: string, quantity: number) => void;
    onAddRow?: (category: string) => void;
    onRemoveRow?: (id: string) => void;
    onCustomNameChange?: (id: string, name: string) => void;
    onCustomPriceChange?: (id: string, price: number) => void;
    disabled?: boolean;
    pricing?: boolean;
    showDiscountedPrice?: boolean;
    discountedPrice?: number;
    onDiscountedPriceChange?: (price: number) => void;
}
