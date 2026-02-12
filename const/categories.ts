export enum PartCategory {
    CPU = 'CPU',
    Motherboard = 'Motherboard',
    RAM = 'RAM',
    GPU = 'GPU',
    Storage = 'Storage',
    PSU = 'PSU',
    Case = 'Case',
    Cooling = 'Cooling',
    Monitor = 'Monitor',
}

export interface CategoryConfigItem {
    key: string;
    name: string; // Short name (e.g. '处理器')
    label: string; // Full label for Select options (e.g. 'CPU(处理器)')
    icon: string; // Emoji
    antColor: string; // Antd tag color
    twColor: string; // Tailwind bg/text classes
    solidColor: string; // Solid color class for dots
}

export const CATEGORY_CONFIG: Record<string, CategoryConfigItem> = {
    cpu: {
        key: 'cpu',
        name: '处理器',
        label: 'CPU(处理器)',
        icon: '🔲',
        antColor: 'magenta',
        twColor: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        solidColor: 'bg-blue-500',
    },
    motherboard: {
        key: 'motherboard',
        name: '主板',
        label: 'Motherboard(主板)',
        icon: '🔌',
        antColor: 'red',
        twColor: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        solidColor: 'bg-indigo-500',
    },
    ram: {
        key: 'ram',
        name: '内存',
        label: 'RAM(内存)',
        icon: '💾',
        antColor: 'volcano',
        twColor: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        solidColor: 'bg-cyan-500',
    },
    gpu: {
        key: 'gpu',
        name: '显卡',
        label: 'GPU(显卡)',
        icon: '🎮',
        antColor: 'orange',
        twColor: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        solidColor: 'bg-purple-500',
    },
    storage: {
        key: 'storage',
        name: '存储',
        label: 'Storage(存储)',
        icon: '💿',
        antColor: 'gold',
        twColor: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
        solidColor: 'bg-emerald-500',
    },
    psu: {
        key: 'psu',
        name: '电源',
        label: 'PSU(电源)',
        icon: '⚡',
        antColor: 'lime',
        twColor: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
        solidColor: 'bg-orange-500',
    },
    case: {
        key: 'case',
        name: '机箱',
        label: 'Case(机箱)',
        icon: '📦',
        antColor: 'green',
        twColor: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        solidColor: 'bg-slate-500',
    },
    cooling: {
        key: 'cooling',
        name: '散热',
        label: 'Cooling(散热)',
        icon: '❄️',
        antColor: 'cyan',
        twColor: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
        solidColor: 'bg-sky-500',
    },
    monitor: {
        key: 'monitor',
        name: '显示器',
        label: 'Monitor(显示器)',
        icon: '🖥️',
        antColor: 'blue',
        twColor: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        solidColor: 'bg-rose-500',
    },
};

export const PACKAGE_CATEGORIES_LIST = Object.values(CATEGORY_CONFIG);

// Legacy support / Helper maps
export const categoryOptions = PACKAGE_CATEGORIES_LIST.map((c) => ({
    value: c.key,
    label: c.label,
    color: c.antColor,
}));

export const categoryDisplayMap = PACKAGE_CATEGORIES_LIST.reduce(
    (acc, cur) => {
        acc[cur.key] = cur.label;
        return acc;
    },
    {} as Record<string, string>
);

export const categoryColorMap = PACKAGE_CATEGORIES_LIST.reduce(
    (acc, cur) => {
        acc[cur.key] = cur.antColor;
        return acc;
    },
    {} as Record<string, string>
);

export const categoryNameMap = PACKAGE_CATEGORIES_LIST.reduce(
    (acc, cur) => {
        acc[cur.key] = cur.name;
        return acc;
    },
    {} as Record<string, string>
);
