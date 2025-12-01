/**
 * 模拟延迟
 * @param ms 毫秒
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 格式化价格
 * @param price 价格
 * @returns 格式化后的字符串 (e.g. "¥100.00")
 */
export const formatPrice = (price: number) => `¥${price.toFixed(2)}`;

/**
 * 格式化日期
 * @param dateString 日期字符串
 * @returns 格式化后的日期时间字符串 (zh-CN)
 */
export const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
};
