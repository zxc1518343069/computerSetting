import { PricingConfig, Product } from '@/const/types';

export class PricingCalculator {
    private config?: PricingConfig;

    constructor(config?: PricingConfig) {
        this.config = config;
    }

    /**
     * 获取特定分类的溢价倍率
     * @param category 产品分类
     * @returns 倍率 (e.g., 1.15 表示溢价 15%)
     */
    getPricingRate(category: string): number {
        if (!this.config) return 1;

        if (this.config.unifiedPricing) {
            return 1 + (this.config.unifiedRate || 0) / 100;
        }

        const rateMap: Record<string, number> = {
            cpu: this.config.cpu,
            motherboard: this.config.motherboard,
            ram: this.config.ram,
            gpu: this.config.gpu,
            storage: this.config.storage,
            psu: this.config.psu,
            case: this.config.case,
            cooling: this.config.cooling,
            monitor: this.config.monitor || 0,
        };

        const rate = rateMap[category] || 0;
        return 1 + rate / 100;
    }

    /**
     * 计算单个产品的最终售价
     * @param product 产品对象
     * @returns 计算后的价格
     */
    getProductPrice(product: Product | undefined): number {
        if (!product) return 0;

        if (product.selling_price !== undefined && product.selling_price !== null) {
            return product.selling_price;
        }

        if (product.is_use_premium === false) {
            return product.price;
        }

        const rawPrice = product.price * this.getPricingRate(product.category);

        if (!this.config?.roundingType || this.config.roundingType === 'none') {
            return rawPrice;
        }

        if (this.config.roundingType === 'integer') {
            return Math.ceil(rawPrice);
        }

        if (this.config.roundingType === 'ten') {
            return Math.ceil(rawPrice / 10) * 10;
        }

        return rawPrice;
    }

    /**
     * 计算套餐项的总价 (单价 * 数量)
     * @param item 套餐项 (包含 product_id, quantity, custom_price)
     * @param products 产品列表 (用于查找 product_id 对应的产品)
     * @returns 该项的总价
     */
    calculateItemPrice(
        item: { product_id: number; quantity: number; custom_price?: number },
        products: Product[]
    ): number {
        if (item.product_id === 0 && item.custom_price !== undefined) {
            return item.custom_price * item.quantity;
        }
        if (!item.product_id) return 0;
        const product = products.find((p) => p.id === item.product_id);
        return product ? this.getProductPrice(product) * item.quantity : 0;
    }
}
