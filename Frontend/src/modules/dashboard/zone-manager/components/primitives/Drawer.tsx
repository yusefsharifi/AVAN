import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children, width = 'max-w-md' }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 max-w-full flex">
                <div className={`w-screen ${width} transform transition ease-in-out duration-300 translate-x-0`}>
                    <div className="h-full flex flex-col bg-white shadow-xl">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
                            <button onClick={onClose} className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 relative overflow-y-auto px-6 py-6">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
