import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatPersianNumber } from '../../utils/formatters';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, colorClass = 'text-blue-600 bg-blue-50' }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start space-x-4 space-x-reverse transition-all hover:shadow-md">
            <div className={`p-3 rounded-lg ${colorClass} shrink-0`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
                <div className="flex items-baseline space-x-2 space-x-reverse">
                    <p className="text-2xl font-bold text-gray-900">
                        {typeof value === 'number' ? formatPersianNumber(value) : value}
                    </p>
                    {trend && (
                        <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {trend.isPositive ? '+' : '-'}{formatPersianNumber(Math.abs(trend.value))}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
