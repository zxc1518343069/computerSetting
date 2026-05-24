export const yuanToCents = (value: number | string | null | undefined): number => {
    if (value === null || value === undefined || value === '') return 0;
    const amount = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100);
};

export const centsToYuan = (value: number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    return value / 100;
};
