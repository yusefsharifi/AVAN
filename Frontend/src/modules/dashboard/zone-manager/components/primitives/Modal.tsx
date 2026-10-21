import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-7xl'
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
                <div className={`relative inline-block w-full ${sizeClasses[size]} p-6 my-8 overflow-y-auto max-h-[90vh] text-right align-middle transition-all transform bg-white shadow-xl rounded-2xl`}>
                    <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
                        <button onClick={onClose} className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="mt-2 text-right">
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
