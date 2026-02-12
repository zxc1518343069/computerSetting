import { PricingCalculator } from '@/utils/pricing';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';
import { fetchPricingConfigService } from '../services';
import { Product } from '../types';

export const usePricing = () => {
    // 获取定价配置
    const { data: config, loading } = useRequest(fetchPricingConfigService);

    // 实例化计算器
    const calculator = useMemo(() => new PricingCalculator(config), [config]);

    // 计算售价
    const getSellingPriceInfo = (product: Product) => {
        if (!config) return { price: product.price, rate: 0 };

        // 计算最终售价（包含取整逻辑）
        const finalPrice = calculator.getProductPrice(product);

        // 计算名义上的溢价率（仅供展示参考）
        // 注意：这里的rate只是原始配置的倍率，不包含取整带来的额外溢价
        const rate = (calculator.getPricingRate(product.category) - 1) * 100;

        return { price: finalPrice, rate };
    };

    return {
        config,
        loading,
        getSellingPriceInfo,
    };
};
