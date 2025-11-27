import React from 'react';
import { Card, Typography } from 'antd';

interface ImportActionCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: 'blue' | 'purple';
    children: React.ReactNode;
}

export const ImportActionCard: React.FC<ImportActionCardProps> = ({
    title,
    description,
    icon,
    color,
    children,
}) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
    };

    return (
        <Card
            bordered={false}
            className="h-full shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl border border-gray-100"
            bodyStyle={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '32px 24px',
            }}
        >
            <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${colorClasses[color]} border`}
            >
                <div className="text-3xl">{icon}</div>
            </div>
            <Typography.Title level={4} style={{ marginBottom: 8 }}>
                {title}
            </Typography.Title>
            <Typography.Text type="secondary" className="mb-8 block min-h-[44px]">
                {description}
            </Typography.Text>
            {children}
        </Card>
    );
};
