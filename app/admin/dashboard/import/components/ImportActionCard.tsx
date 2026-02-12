import React from 'react';

interface ImportActionCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: 'blue' | 'purple' | 'green';
    children: React.ReactNode;
}

export const ImportActionCard: React.FC<ImportActionCardProps> = ({
    title,
    description,
    icon,
    color,
    children,
}) => {
    const styles = {
        blue: {
            bg: 'bg-blue-50/50 dark:bg-blue-900/10',
            border: 'border-blue-100 dark:border-blue-900/30',
            iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
            hoverBorder: 'group-hover:border-blue-300 dark:group-hover:border-blue-700',
            glow: 'group-hover:shadow-blue-200/50 dark:group-hover:shadow-blue-900/20',
            gradient: 'from-blue-500 to-cyan-400',
        },
        purple: {
            bg: 'bg-purple-50/50 dark:bg-purple-900/10',
            border: 'border-purple-100 dark:border-purple-900/30',
            iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
            hoverBorder: 'group-hover:border-purple-300 dark:group-hover:border-purple-700',
            glow: 'group-hover:shadow-purple-200/50 dark:group-hover:shadow-purple-900/20',
            gradient: 'from-purple-500 to-pink-400',
        },
        green: {
            bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
            border: 'border-emerald-100 dark:border-emerald-900/30',
            iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
            hoverBorder: 'group-hover:border-emerald-300 dark:group-hover:border-emerald-700',
            glow: 'group-hover:shadow-emerald-200/50 dark:group-hover:shadow-emerald-900/20',
            gradient: 'from-emerald-500 to-teal-400',
        },
    };

    const currentStyle = styles[color];

    return (
        <div
            className={`group relative h-full overflow-hidden rounded-2xl border ${currentStyle.border} ${currentStyle.bg} p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${currentStyle.hoverBorder} ${currentStyle.glow} backdrop-blur-sm`}
        >
            {/* Decorative Gradient Blob */}
            <div
                className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${currentStyle.gradient} opacity-10 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-20`}
            />

            <div className="relative z-10 flex flex-col items-center text-center h-full">
                <div
                    className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl ${currentStyle.iconBg} shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                >
                    <div className="text-4xl">{icon}</div>
                </div>

                <h3 className="mb-3 text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-black dark:group-hover:text-white transition-colors">
                    {title}
                </h3>

                <p className="mb-8 text-sm leading-relaxed text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-grow">
                    {description}
                </p>

                <div className="w-full transform transition-all duration-300 group-hover:scale-105">
                    {children}
                </div>
            </div>
        </div>
    );
};
