export const categoryOptions = [
    { value: 'cpu', label: 'CPU(处理器)', color: 'magenta' },
    { value: 'motherboard', label: 'Motherboard(主板)', color: 'red' },
    { value: 'ram', label: 'RAM(内存)', color: 'volcano' },
    { value: 'gpu', label: 'GPU(显卡)', color: 'orange' },
    { value: 'storage', label: 'Storage(存储)', color: 'gold' },
    { value: 'psu', label: 'PSU(电源)', color: 'lime' },
    { value: 'case', label: 'Case(机箱)', color: 'green' },
    { value: 'cooling', label: 'Cooling(散热)', color: 'cyan' },
    { value: 'monitor', label: 'Monitor(显示器)', color: 'blue' },
];

export const categoryDisplayMap: Record<string, string> = categoryOptions.reduce(
    (acc, cur) => {
        acc[cur.value] = cur.label;
        return acc;
    },
    {} as Record<string, string>
);

export const categoryColorMap: Record<string, string> = categoryOptions.reduce(
    (acc, cur) => {
        acc[cur.value] = cur.color;
        return acc;
    },
    {} as Record<string, string>
);
