import React from 'react';

interface StepperProps {
    steps: { id: string; title: string }[];
    currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
    return (
        <div className="py-4 px-2">
            <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 z-0"></div>
                <div
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-600 transition-all duration-300 z-0"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2 transition-colors duration-300 ${isCompleted ? 'bg-blue-600 text-white border-blue-600' :
                                        isCurrent ? 'bg-white text-blue-600 border-blue-600' :
                                            'bg-white text-gray-400 border-gray-200'
                                    }`}
                            >
                                {isCompleted ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </div>
                            <span className={`mt-2 text-xs md:text-sm font-medium absolute -bottom-6 whitespace-nowrap ${isCurrent || isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
