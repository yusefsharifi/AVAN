import React from 'react';
import { formatJalaliDateTime } from '../../utils/formatters';

export interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    date: string;
    icon?: React.ReactNode;
    isActive?: boolean;
}

interface TimelineProps {
    items: TimelineItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {items.map((item, itemIdx) => (
                    <li key={item.id}>
                        <div className="relative pb-8">
                            {itemIdx !== items.length - 1 ? (
                                <span className="absolute top-4 right-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3 space-x-reverse">
                                <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${item.isActive ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                        {item.icon ? (
                                            <span className="text-white w-4 h-4">{item.icon}</span>
                                        ) : (
                                            <div className="h-2.5 w-2.5 rounded-full bg-white" />
                                        )}
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 space-x-reverse pt-1.5">
                                    <div>
                                        <p className="text-sm text-gray-500">{item.title}</p>
                                        {item.description && (
                                            <p className="mt-1 text-sm text-gray-700">{item.description}</p>
                                        )}
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                        <time dateTime={item.date}>{formatJalaliDateTime(item.date)}</time>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
