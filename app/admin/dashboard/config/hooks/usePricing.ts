import { PricingCalculator } from '@/utils/pricing';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';
import { fetchPricingConfigService } from '../services';
import { Product } from '../types';

const DEFAULT_PRICING_CONFIG = {
    unifiedPricing: true,
    unifiedRate: 0,
    roundingType: 'none' as const,
    cpu: 0,
    motherboard: 0,
    ram: 0,
    gpu: 0,
    storage: 0,
    psu: 0,
    case: 0,
    cooling: 0,
    monitor: 0,
};

export const usePricing = () => {
    const { data: config, loading } = useRequest(fetchPricingConfigService);

    // 实例化计算器，如果没加载到配置则使用默认配置
    const calculator = useMemo(
        () => new PricingCalculator(config || DEFAULT_PRICING_CONFIG),
        [config]
    );

    // 计算售价
    const getSellingPriceInfo = (product: Product) => {
        // 计算最终售价（包含取整逻辑）
        const finalPrice = calculator.getProductPrice(product);

        // 计算名义上的溢价率（仅供展示参考）
        const rate = (calculator.getPricingRate(product.category) - 1) * 100;

        return { price: finalPrice, rate };
    };

    return {
        config: config || DEFAULT_PRICING_CONFIG,
        loading,
        getSellingPriceInfo,
    };
};
