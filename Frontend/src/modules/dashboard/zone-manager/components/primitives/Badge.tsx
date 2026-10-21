import React from 'react';
import { statusLabel, STATUS_COLORS } from '../../constants/statusMaps';

interface StatusBadgeProps {
    status: string;
    label?: string;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
    const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    const displayLabel = label || statusLabel(status);

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
            {displayLabel}
        </span>
    );
};

export const CustomBadge: React.FC<{ children: React.ReactNode; colorClass: string; className?: string }> = ({ children, colorClass, className = '' }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
        {children}
    </span>
);
