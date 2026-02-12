/**
 * Canvas 报价单导出工具
 * 使用原生 Canvas API 绘制报价单，避免 Tailwind CSS 兼容问题
 */

import { CATEGORY_CONFIG, PACKAGE_CATEGORIES_LIST } from '@/const';
import { EditablePartRow, Product } from '@/app/admin/dashboard/packages/types';

// 颜色配置
const COLORS = {
    // 背景
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgAccent: '#f1f5f9',
    
    // 文字
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    textLight: '#cbd5e1',
    
    // 强调色
    accent: '#3b82f6',
    accentLight: '#dbeafe',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    
    // 边框
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    
    // 分类颜色
    categoryColors: {
        cpu: '#3b82f6',
        motherboard: '#8b5cf6',
        ram: '#10b981',
        gpu: '#ef4444',
        storage: '#f59e0b',
        psu: '#f97316',
        case: '#64748b',
        cooling: '#06b6d4',
        monitor: '#ec4899',
    } as Record<string, string>,
};

// 尺寸配置
const SIZES = {
    width: 800,
    padding: 40,
    rowHeight: 48,
    headerHeight: 140,
    footerHeight: 100,
    borderRadius: 12,
};

// 字体配置
const FONTS = {
    title: 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    subtitle: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    header: 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    bodyBold: 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    small: '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    price: 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export interface QuoteExportData {
    items: EditablePartRow[];
    products: Product[];
    totalPrice: number;
    discountedPrice?: number;
    getItemMetrics: (item: EditablePartRow) => {
        unitCost: number;
        unitSellPrice: number;
        totalCost: number;
        totalSellPrice: number;
        totalProfit: number;
        profitRate: number;
    };
}

/**
 * 绘制圆角矩形
 */
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * 绘制文字（支持自动截断）
 */
function drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    options: { align?: CanvasTextAlign; color?: string; font?: string } = {}
) {
    const { align = 'left', color = COLORS.textPrimary, font } = options;
    
    if (font) ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    
    // 文字截断
    let displayText = text;
    const metrics = ctx.measureText(text);
    if (metrics.width > maxWidth) {
        const ellipsis = '...';
        let truncated = text;
        while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        displayText = truncated + ellipsis;
    }
    
    ctx.fillText(displayText, x, y);
}

/**
 * 绘制分类标签
 */
function drawCategoryTag(
    ctx: CanvasRenderingContext2D,
    category: string,
    x: number,
    y: number
) {
    const config = CATEGORY_CONFIG[category];
    const color = COLORS.categoryColors[category] || COLORS.textMuted;
    const name = config?.name || category;
    
    const tagWidth = 50;
    const tagHeight = 22;
    const tagRadius = 4;
    
    // 背景
    ctx.fillStyle = color + '15'; // 15% opacity
    roundRect(ctx, x, y - tagHeight / 2, tagWidth, tagHeight, tagRadius);
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = color + '40';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y - tagHeight / 2, tagWidth, tagHeight, tagRadius);
    ctx.stroke();
    
    // 文字
    ctx.font = FONTS.small;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x + tagWidth / 2, y);
}

/**
 * 绘制表头
 */
function drawHeader(ctx: CanvasRenderingContext2D, width: number): number {
    const y = SIZES.padding;
    
    // Logo 区域背景
    ctx.fillStyle = COLORS.bgSecondary;
    roundRect(ctx, SIZES.padding, y, width - SIZES.padding * 2, 80, SIZES.borderRadius);
    ctx.fill();
    
    // Logo 图标背景
    const logoX = SIZES.padding + 20;
    const logoY = y + 20;
    ctx.fillStyle = COLORS.accent;
    roundRect(ctx, logoX, logoY, 40, 40, 8);
    ctx.fill();
    
    // Logo 图标（闪电符号）
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', logoX + 20, logoY + 20);
    
    // 标题
    ctx.font = FONTS.title;
    ctx.fillStyle = COLORS.textPrimary;
    ctx.textAlign = 'left';
    ctx.fillText('明远装机报价单', logoX + 55, logoY + 12);
    
    // 副标题
    ctx.font = FONTS.subtitle;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('专业电脑配置方案', logoX + 55, logoY + 35);
    
    // 日期
    const dateX = width - SIZES.padding - 20;
    ctx.font = FONTS.small;
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'right';
    ctx.fillText(`生成日期: ${new Date().toLocaleDateString('zh-CN')}`, dateX, logoY + 12);
    ctx.fillText(`时间: ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`, dateX, logoY + 32);
    
    // 表头行
    const headerY = y + 100;
    ctx.font = FONTS.header;
    ctx.fillStyle = COLORS.textMuted;
    
    const colX = {
        category: SIZES.padding + 20,
        name: SIZES.padding + 90,
        price: SIZES.padding + 400,
        quantity: SIZES.padding + 520,
        subtotal: SIZES.padding + 620,
    };
    
    ctx.textAlign = 'left';
    ctx.fillText('分类', colX.category, headerY);
    ctx.fillText('配件名称', colX.name, headerY);
    ctx.textAlign = 'right';
    ctx.fillText('单价', colX.price, headerY);
    ctx.fillText('数量', colX.quantity, headerY);
    ctx.fillText('小计', colX.subtotal, headerY);
    
    // 分隔线
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SIZES.padding + 20, headerY + 15);
    ctx.lineTo(width - SIZES.padding - 20, headerY + 15);
    ctx.stroke();
    
    return headerY + 30;
}

/**
 * 绘制数据行
 */
function drawDataRow(
    ctx: CanvasRenderingContext2D,
    item: EditablePartRow,
    productName: string,
    unitPrice: number,
    subtotal: number,
    y: number,
    width: number
): number {
    const colX = {
        category: SIZES.padding + 20,
        name: SIZES.padding + 90,
        price: SIZES.padding + 400,
        quantity: SIZES.padding + 520,
        subtotal: SIZES.padding + 620,
    };
    
    // 分类标签
    drawCategoryTag(ctx, item.category, colX.category, y);
    
    // 产品名称
    drawText(ctx, productName, colX.name, y, 280, {
        font: FONTS.body,
        color: COLORS.textPrimary,
    });
    
    // 单价
    ctx.font = FONTS.body;
    ctx.fillStyle = COLORS.textSecondary;
    ctx.textAlign = 'right';
    ctx.fillText(`¥${unitPrice.toFixed(2)}`, colX.price, y);
    
    // 数量
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(`${item.quantity || 1}`, colX.quantity, y);
    
    // 小计
    ctx.font = FONTS.bodyBold;
    ctx.fillStyle = COLORS.textPrimary;
    ctx.fillText(`¥${subtotal.toFixed(2)}`, colX.subtotal, y);
    
    return y + SIZES.rowHeight;
}

/**
 * 绘制页脚
 */
function drawFooter(
    ctx: CanvasRenderingContext2D,
    totalPrice: number,
    discountedPrice: number | undefined,
    y: number,
    width: number
): number {
    // 分隔线
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SIZES.padding + 20, y);
    ctx.lineTo(width - SIZES.padding - 20, y);
    ctx.stroke();
    
    const footerY = y + 30;
    
    // 总计区域背景
    ctx.fillStyle = COLORS.bgAccent;
    roundRect(ctx, SIZES.padding + 20, footerY - 15, width - SIZES.padding * 2 - 40, 60, SIZES.borderRadius);
    ctx.fill();
    
    // 总计标签
    ctx.font = FONTS.bodyBold;
    ctx.fillStyle = COLORS.textSecondary;
    ctx.textAlign = 'left';
    ctx.fillText('配置总价', SIZES.padding + 40, footerY + 15);
    
    // 总计金额
    ctx.font = FONTS.price;
    ctx.fillStyle = COLORS.textPrimary;
    ctx.textAlign = 'right';
    const priceX = width - SIZES.padding - 40;
    ctx.fillText(`¥${totalPrice.toFixed(2)}`, priceX, footerY + 15);
    
    // 折扣价（如果有）
    if (discountedPrice && discountedPrice > 0 && discountedPrice < totalPrice) {
        const discountY = footerY + 70;
        
        // 折扣标签
        ctx.font = FONTS.body;
        ctx.fillStyle = COLORS.success;
        ctx.textAlign = 'left';
        ctx.fillText('优惠价', SIZES.padding + 40, discountY);
        
        // 折扣金额
        ctx.font = FONTS.price;
        ctx.fillStyle = COLORS.success;
        ctx.textAlign = 'right';
        ctx.fillText(`¥${discountedPrice.toFixed(2)}`, priceX, discountY);
        
        return discountY + 40;
    }
    
    return footerY + 60;
}

/**
 * 绘制底部信息
 */
function drawBottomInfo(ctx: CanvasRenderingContext2D, y: number, width: number) {
    ctx.font = FONTS.small;
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    
    ctx.fillText('明远装机工坊 | 专业电脑配置服务', width / 2, y);
    ctx.fillText('价格仅供参考，以实际成交价为准', width / 2, y + 20);
}

/**
 * 主函数：生成报价单图片
 */
export function generateQuoteImage(data: QuoteExportData): string {
    const { items, products, totalPrice, discountedPrice, getItemMetrics } = data;
    
    // 过滤有效项目
    const validItems = items.filter(item => item.product_id && item.product_id > 0);
    
    // 计算画布高度
    const contentHeight = validItems.length * SIZES.rowHeight;
    const totalHeight = SIZES.headerHeight + contentHeight + SIZES.footerHeight + 80;
    
    // 创建画布
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZES.width * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${SIZES.width}px`;
    canvas.style.height = `${totalHeight}px`;
    
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    
    // 背景
    ctx.fillStyle = COLORS.bgPrimary;
    ctx.fillRect(0, 0, SIZES.width, totalHeight);
    
    // 绘制表头
    let currentY = drawHeader(ctx, SIZES.width);
    
    // 绘制数据行
    PACKAGE_CATEGORIES_LIST.forEach((cat) => {
        const categoryItems = validItems.filter(item => item.category === cat.key);
        
        categoryItems.forEach(item => {
            const product = products.find(p => p.id === item.product_id);
            const metrics = getItemMetrics(item);
            
            const productName = product?.name || item.custom_name || '未知产品';
            const unitPrice = metrics.unitSellPrice;
            const subtotal = metrics.totalSellPrice;
            
            currentY = drawDataRow(ctx, item, productName, unitPrice, subtotal, currentY, SIZES.width);
        });
    });
    
    // 绘制页脚
    currentY = drawFooter(ctx, totalPrice, discountedPrice, currentY + 20, SIZES.width);
    
    // 绘制底部信息
    drawBottomInfo(ctx, currentY + 20, SIZES.width);
    
    // 返回 Data URL
    return canvas.toDataURL('image/png', 1.0);
}

/**
 * 下载报价单图片
 */
export function downloadQuoteImage(data: QuoteExportData, filename: string = '报价单.png') {
    const dataUrl = generateQuoteImage(data);
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 复制报价单图片到剪贴板
 */
export async function copyQuoteImageToClipboard(data: QuoteExportData): Promise<boolean> {
    try {
        const dataUrl = generateQuoteImage(data);
        
        // 将 Data URL 转换为 Blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        // 复制到剪贴板
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        return true;
    } catch (error) {
        console.error('复制到剪贴板失败:', error);
        return false;
    }
}
